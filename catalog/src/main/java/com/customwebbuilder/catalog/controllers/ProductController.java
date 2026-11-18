package com.customwebbuilder.catalog.controllers;


import com.customwebbuilder.catalog.mappers.ProductInputMapper;
import com.customwebbuilder.catalog.mappers.ProductOutputMapper;
import com.customwebbuilder.catalog.models.dtos.input.ProductInputDTO;
import com.customwebbuilder.catalog.models.dtos.output.ProductOutputDTO;
import com.customwebbuilder.catalog.models.enums.ProductSortField;
import com.customwebbuilder.catalog.services.ProductsService;
import com.customwebbuilder.catalog.validation.ValidSort;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Nullable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

/**
 * Relational product API.
 *
 * <p>It reads and writes the database through {@link ProductsService}, which is the decorator that mirrors every
 * committed write into the search index. Clients that search or filter products use the endpoints of
 * {@link ProductSearchController} instead, because those are served by OpenSearch.
 */
@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping(path = "/product", version = "1+")
@Tag(name = "Products", description = "Relational product API served by the database. Every committed write is mirrored into the search index; clients that search or filter should use the product search endpoints.")
public class ProductController {
    private final ProductsService productsService;
    private final ProductOutputMapper productOutputMapper;
    private final ProductInputMapper productInputMapper;


    /**
     * Returns one page of products.
     *
     * <p>It is a legacy path kept for manual experiments; new clients should use the search endpoint.
     *
     * @param pageable zero-based page index, page size and ordering, defaulting to 20 products sorted by name
     *
     * @return the products of the requested page plus the pagination metadata
     */
    @Operation(summary = "List all products", description = "Returns one page of every product stored in the database. It is a legacy path kept for manual experiments; new clients should use the product search endpoint.")
    @ApiResponse(responseCode = "200", description = "Products of the requested page with the pagination metadata")
    @GetMapping(path = "")
    public PagedModel<ProductOutputDTO> getProductsPageable(@ParameterObject @Nullable @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        return new PagedModel<>(productsService.findAll(pageable).map(productOutputMapper::toDTO));
    }


    /**
     * Returns one page of products that belong to the given category, ordered by the requested fields.
     *
     * <p>The page and the ordering use the standard Spring parameters ({@code page}, {@code size} and
     * {@code sort=property,direction}). Only the fields listed in {@link ProductSortField} are accepted, checked by
     * {@link ValidSort} before this method runs, and the page size is capped by
     * {@code spring.data.web.pageable.max-page-size}.
     *
     * @param category exact name of the category used as filter
     * @param pageable zero-based page index, page size and ordering, defaulting to 20 products sorted by name
     *
     * @return the products of the requested page plus the pagination metadata
     */
    @Operation(summary = "Search products by category", description = """
            Returns the products of the requested page that belong to the given category. The page uses the
            standard page, size and sort parameters; only the product fields accepted by the sort whitelist can
            be used as sort properties, the default ordering is name,asc and the page size is capped at 100.
            """)
    @ApiResponse(responseCode = "200", description = "Products of the category with the pagination metadata")
    @ApiResponse(responseCode = "400", description = "The category is blank or the requested sort field is not supported", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(type = "object", additionalProperties = Schema.AdditionalPropertiesValue.TRUE, example = "{\"sort\": \"Unsupported sort field: unknown\"}")))
    @Parameter(name = "category", in = ParameterIn.QUERY, required = true, description = "Exact name of the category used as filter")
    @GetMapping("/search")
    public PagedModel<ProductOutputDTO> searchProductsByCategory(@RequestParam @NotBlank String category, @ParameterObject @ValidSort @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        return new PagedModel<>(productsService.findByCategoryName(category, pageable).map(productOutputMapper::toDTO));
    }

    /**
     * Returns one product.
     *
     * @param id identifier of the product
     *
     * @return the matching product
     */
    @Operation(summary = "Get a product by id", description = "Returns the product stored in the database with its categories.")
    @ApiResponse(responseCode = "200", description = "Matching product")
    @GetMapping("/{id}")
    public ProductOutputDTO getProductById(@Parameter(description = "Identifier of the product", required = true, schema = @Schema(type = "integer", format = "int64")) @PathVariable Long id) {
        return productOutputMapper.toDTO(productsService.findById(id));
    }

    /**
     * Deletes one product.
     *
     * @param id identifier of the product
     */
    @Operation(summary = "Delete a product", description = "Removes the product from the database and, after the transaction commits, from the search index.")
    @ApiResponse(responseCode = "204", description = "Product deleted")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProductById(@Parameter(description = "Identifier of the product", required = true, schema = @Schema(type = "integer", format = "int64")) @PathVariable Long id) {
        productsService.delete(id);
    }


    /**
     * Creates a product.
     *
     * @param productInputDTO payload of the new product, validated before this method runs
     *
     * @return the created product with a {@code Location} header pointing to its resource
     */
    @Operation(summary = "Create a product", description = "Stores the product in the database and mirrors it into the search index after the transaction commits.")
    @ApiResponse(responseCode = "201", description = "Product created", headers = @Header(name = HttpHeaders.LOCATION, description = "Path of the created product", schema = @Schema(type = "string", format = "uri")))
    @ApiResponse(responseCode = "400", description = "The product payload is invalid", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(type = "object", additionalProperties = Schema.AdditionalPropertiesValue.TRUE, example = "{\"name\": \"must not be blank\"}")))
    @PostMapping({"", "/"})
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<ProductOutputDTO> createProduct(@RequestBody @Valid ProductInputDTO productInputDTO) {

        ProductOutputDTO productOutputDTO = productOutputMapper.toDTO(productsService.create(productInputMapper.toEntity(productInputDTO)));

        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(productOutputDTO.getId()).toUri();

        return ResponseEntity.created(URI.create(location.getRawPath())).body(productOutputDTO);
    }

}
