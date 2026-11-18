package com.customwebbuilder.catalog.controllers;

import com.customwebbuilder.catalog.mappers.ProductOutputMapper;
import com.customwebbuilder.catalog.mappers.ProductSearchMapper;
import com.customwebbuilder.catalog.models.Product;
import com.customwebbuilder.catalog.models.dtos.input.ProductSearchFilterInputDTO;
import com.customwebbuilder.catalog.models.dtos.input.ProductSearchInputDTO;
import com.customwebbuilder.catalog.models.dtos.output.ProductOutputDTO;
import com.customwebbuilder.catalog.models.dtos.output.ProductReindexOutputDTO;
import com.customwebbuilder.catalog.models.dtos.output.ProductSearchOutputDTO;
import com.customwebbuilder.catalog.models.enums.FacetName;
import com.customwebbuilder.catalog.models.enums.ProductSortField;
import com.customwebbuilder.catalog.models.search.FacetBucket;
import com.customwebbuilder.catalog.models.search.ProductSearchDocument;
import com.customwebbuilder.catalog.models.search.ProductSearchResult;
import com.customwebbuilder.catalog.services.ProductSearchService;
import com.customwebbuilder.catalog.services.ProductsService;
import com.customwebbuilder.catalog.validation.ValidSort;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Nullable;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Product API backed by OpenSearch.
 *
 * <p>Reads and searches come from the search index while writes are delegated to {@link ProductsService}, which keeps
 * the database as the authoritative store and mirrors every committed change into OpenSearch.
 */
@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping(path = "/product-search", version = "1+")
@Tag(name = "Product search", description = "OpenSearch-backed product API. Reads and searches are served by the search index, while writes are delegated to the database and mirrored into the index after the transaction commits.")
public class ProductSearchController {

    private final ProductSearchService productSearchService;
    private final ProductsService productsService;
    private final ProductSearchMapper productSearchMapper;
    private final ProductOutputMapper productOutputMapper;

    /**
     * Searches the indexed products by free text, category, active flag and price range.
     *
     * <p>The filters arrive as query parameters and are bound to a {@link ProductSearchFilterInputDTO}, which
     * validates the price bounds before this method runs. The page and the ordering use the standard Spring parameters
     * ({@code page}, {@code size} and {@code sort=property,direction}). Only the fields listed in
     * {@link ProductSortField} are accepted, checked by {@link ValidSort} before this method runs. The response also
     * carries the facet counts computed over the same filters, so the client can build new filters with them, and the
     * lowest and highest price of the whole index, which are the limits of the price slider.
     *
     * @param filter   text, category, active flag and price bounds of the search, all optional
     * @param pageable zero-based page index, page size and ordering, defaulting to 20 products sorted by name
     *
     * @return the products of the requested page, the facet counts and the price bounds
     */
    @Operation(summary = "Search indexed products", description = """
            Returns the products of the requested page that match the optional filters, together with the facet
            counts computed over the same filters and the lowest and highest price of the whole index. The page
            uses the standard page, size and sort parameters; only the product fields accepted by the sort
            whitelist can be used as sort properties, and the default ordering is name,asc.
            """)
    @ApiResponse(responseCode = "200", description = "Products of the requested page, facet counts and price bounds")
    @ApiResponse(responseCode = "400", description = "A filter, the price range or a pagination parameter is invalid", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(type = "object", additionalProperties = Schema.AdditionalPropertiesValue.TRUE, example = "{\"minPrice\": \"must be lower than or equal to maxPrice\"}")))
    @GetMapping
    public ProductSearchOutputDTO search(@ParameterObject @Valid @ModelAttribute ProductSearchFilterInputDTO filter, @ParameterObject @ValidSort @Nullable @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        ProductSearchResult result = productSearchService.search(filter.getQ(), filter.getCategory(), filter.getActive(), filter.getMinPrice(), filter.getMaxPrice(), pageable);

        return new ProductSearchOutputDTO(new PagedModel<>(result.products().map(productSearchMapper::toOutputDto)), toFacetResponse(result.facets()), result.priceBounds());
    }

    /**
     * Translates the facet map of the service into the response map.
     *
     * @param facets bucket counts grouped by facet
     *
     * @return the bucket counts keyed by the response facet name, keeping the declaration order
     */
    private static Map<String, List<FacetBucket>> toFacetResponse(Map<FacetName, List<FacetBucket>> facets) {
        Map<String, List<FacetBucket>> response = new LinkedHashMap<>();

        facets.forEach((facet, buckets) -> response.put(facet.getKey(), buckets));

        return response;
    }

    /**
     * Returns one indexed product.
     *
     * @param id identifier of the product
     *
     * @return the indexed product
     *
     * @throws ResponseStatusException with {@code 404 Not Found} when the product is not indexed
     */
    @Operation(summary = "Get an indexed product by id", description = "Returns the product as stored in the search index. A product that exists in the database but has not been indexed yet is reported as not found.")
    @ApiResponse(responseCode = "200", description = "Indexed product")
    @ApiResponse(responseCode = "404", description = "The product is not indexed")
    @GetMapping("/{id}")
    public ProductOutputDTO findById(@Parameter(description = "Identifier of the product", required = true, schema = @Schema(type = "integer", format = "int64")) @PathVariable Long id) {
        return productSearchService.findById(id).map(productSearchMapper::toOutputDto).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found with id: " + id));
    }

    /**
     * Creates a product in the database and mirrors it into the search index.
     *
     * @param input complete product payload
     *
     * @return the created product with a {@code Location} header pointing to its search resource
     */
    @Operation(summary = "Create a product", description = "Stores the product in the database and mirrors it into the search index after the transaction commits. The index write is best effort, so a search failure does not roll back the relational write.")
    @ApiResponse(responseCode = "201", description = "Product created in the database and mirrored into the index", headers = @Header(name = HttpHeaders.LOCATION, description = "Path of the created product in the search resource", schema = @Schema(type = "string", format = "uri")))
    @ApiResponse(responseCode = "400", description = "The product payload is invalid", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(type = "object", additionalProperties = Schema.AdditionalPropertiesValue.TRUE, example = "{\"name\": \"must not be blank\"}")))
    @PostMapping
    public ResponseEntity<ProductOutputDTO> create(@RequestBody @Valid ProductSearchInputDTO input) {
        Product createdProduct = productsService.create(productSearchMapper.toEntity(input));
        ProductOutputDTO output = productOutputMapper.toDTO(createdProduct);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(createdProduct.getId()).toUri();

        return ResponseEntity.created(URI.create(location.getRawPath())).body(output);
    }

    /**
     * Updates a product in the database and mirrors the committed result into the search index.
     *
     * @param id    identifier of the product
     * @param input complete product payload
     *
     * @return the updated product
     */
    @Operation(summary = "Update a product", description = "Replaces the stored product with the submitted payload in the database and mirrors the committed result into the search index. The index write is best effort, so a search failure does not roll back the relational write.")
    @ApiResponse(responseCode = "200", description = "Updated product")
    @ApiResponse(responseCode = "400", description = "The product payload is invalid", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(type = "object", additionalProperties = Schema.AdditionalPropertiesValue.TRUE, example = "{\"price\": \"must be greater than 0.0\"}")))

    @PutMapping("/{id}")
    public ProductOutputDTO update(@Parameter(description = "Identifier of the product", required = true, schema = @Schema(type = "integer", format = "int64")) @PathVariable Long id, @RequestBody @Valid ProductSearchInputDTO input) {
        Product updatedProduct = productsService.update(id, productSearchMapper.toEntity(input));

        return productOutputMapper.toDTO(updatedProduct);
    }

    /**
     * Deletes a product from the database and removes it from the search index.
     *
     * @param id identifier of the product
     */
    @Operation(summary = "Delete a product", description = "Removes the product from the database and, after the transaction commits, from the search index. The index removal is best effort, so a search failure does not roll back the relational delete.")
    @ApiResponse(responseCode = "204", description = "Product deleted from the database and removed from the index")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@Parameter(description = "Identifier of the product", required = true, schema = @Schema(type = "integer", format = "int64")) @PathVariable Long id) {
        productsService.delete(id);
    }

    /**
     * Rebuilds the search index from the products stored in the database.
     *
     * @return the name of the rebuilt index and the number of products written into it
     */
    @Operation(summary = "Rebuild the product search index", description = "Reads every product from the database and writes it into the search index again. Unlike incremental writes, a failure of the rebuild is propagated to the caller.")
    @ApiResponse(responseCode = "200", description = "Index rebuilt with the number of products written")
    @ApiResponse(responseCode = "500", description = "The index could not be rebuilt")
    @PostMapping("/reindex")
    public ProductReindexOutputDTO reindex() {
        return new ProductReindexOutputDTO(ProductSearchDocument.INDEX_NAME, productSearchService.reindex());
    }
}
