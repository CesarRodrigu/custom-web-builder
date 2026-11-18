package com.customwebbuilder.catalog.controllers;

import com.customwebbuilder.catalog.BaseTest;
import com.customwebbuilder.catalog.mappers.ProductOutputMapper;
import com.customwebbuilder.catalog.mappers.ProductSearchMapper;
import com.customwebbuilder.catalog.models.Product;
import com.customwebbuilder.catalog.models.dtos.input.ProductSearchInputDTO;
import com.customwebbuilder.catalog.models.dtos.output.ProductOutputDTO;
import com.customwebbuilder.catalog.models.enums.FacetName;
import com.customwebbuilder.catalog.models.search.FacetBucket;
import com.customwebbuilder.catalog.models.search.PriceBounds;
import com.customwebbuilder.catalog.models.search.ProductSearchDocument;
import com.customwebbuilder.catalog.models.search.ProductSearchResult;
import com.customwebbuilder.catalog.services.ProductSearchService;
import com.customwebbuilder.catalog.services.ProductsService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Behaviour of {@link ProductSearchController} over the MVC slice, covering the search, the reads served by the index,
 * the writes delegated to the database and the reindex endpoint.
 *
 * <p>No request path carries the version segment, because the mock builder writes the version the application serves
 * by default, read from {@code spring.mvc.apiversion.default}.
 *
 * <p>The slice also covers the validation of the query parameters, which the proxy of the controller and the
 * {@code @Valid} filter enforce before the method body runs.
 */
@WebMvcTest(ProductSearchController.class)
@Import(ApiVersionTestSupport.ApiVersionConfiguration.class)
class ProductSearchControllerTest extends BaseTest {

    /**
     * Path declared by the {@code @RequestMapping} of {@link ProductSearchController}.
     */
    private static final String CONTROLLER_PATH = "/product-search";

    /**
     * Path of the search resource including the prefix added by
     * {@link com.customwebbuilder.catalog.config.WebConfig} and without the version segment, which the mock builder
     * inserts on every request.
     */
    private static final String BASE_PATH = ApiVersionTestSupport.API_PREFIX + CONTROLLER_PATH;

    /**
     * Version the application serves by default, read from the configuration so the tests follow it.
     */
    @Value("${spring.mvc.apiversion.default}")
    private String defaultVersion;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProductSearchService productSearchService;

    @MockitoBean
    private ProductsService productsService;

    @MockitoBean
    private ProductSearchMapper productSearchMapper;

    @MockitoBean
    private ProductOutputMapper productOutputMapper;

    @Test
    void returnsTheRequestedPageWithTheSearchFiltersAndTheFacetCounts() throws Exception {
        ProductSearchDocument document = documentWithId(7L);
        ProductOutputDTO output = outputWithId(7L);
        Pageable pageable = PageRequest.of(1, 2, Sort.by(Sort.Direction.DESC, "price"));
        ProductSearchResult result = new ProductSearchResult(
                new PageImpl<>(List.of(document), pageable, 5),
                Map.of(FacetName.CATEGORY, List.of(new FacetBucket("Peripherals", 3L))),
                new PriceBounds(new BigDecimal("10.00"), new BigDecimal("1199.00"))
        );
        when(productSearchService.search(
                eq("keyboard"),
                eq("Peripherals"),
                eq(true),
                eq(new BigDecimal("10.00")),
                eq(new BigDecimal("1199.00")),
                any(Pageable.class)
        )).thenReturn(result);
        when(productSearchMapper.toOutputDto(document)).thenReturn(output);

        mockMvc.perform(versioned(get(BASE_PATH))
                        .param("q", "keyboard")
                        .param("category", "Peripherals")
                        .param("active", "true")
                        .param("minPrice", "10.00")
                        .param("maxPrice", "1199.00")
                        .param("page", "1")
                        .param("size", "2")
                        .param("sort", "price,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.products.content[0].id").value(7))
                .andExpect(jsonPath("$.products.page.number").value(1))
                .andExpect(jsonPath("$.products.page.size").value(2))
                .andExpect(jsonPath("$.products.page.totalElements").value(5))
                .andExpect(jsonPath("$.products.page.totalPages").value(3))
                .andExpect(jsonPath("$.facets.categories[0].key").value("Peripherals"))
                .andExpect(jsonPath("$.facets.categories[0].count").value(3))
                .andExpect(jsonPath("$.priceBounds.min").value(10.00))
                .andExpect(jsonPath("$.priceBounds.max").value(1199.00));

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(productSearchService).search(
                eq("keyboard"),
                eq("Peripherals"),
                eq(true),
                eq(new BigDecimal("10.00")),
                eq(new BigDecimal("1199.00")),
                captor.capture()
        );

        assertThat(captor.getValue().getSort()).isEqualTo(Sort.by(Sort.Direction.DESC, "price"));
    }

    @Test
    void appliesTheDefaultPaginationAndOrdering() throws Exception {
        when(productSearchService.search(any(), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(new ProductSearchResult(
                        new PageImpl<>(List.of(), PageRequest.of(0, 20), 0),
                        Map.of(),
                        PriceBounds.empty()
                ));

        mockMvc.perform(versioned(get(BASE_PATH)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priceBounds.min").doesNotExist())
                .andExpect(jsonPath("$.priceBounds.max").doesNotExist());

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(productSearchService).search(any(), any(), any(), any(), any(), captor.capture());

        assertThat(captor.getValue().getPageNumber()).isZero();
        assertThat(captor.getValue().getPageSize()).isEqualTo(20);
        assertThat(captor.getValue().getSort()).isEqualTo(Sort.by(Sort.Direction.ASC, "name"));
    }

    @Test
    void rejectsAPriceRangeWhoseLowerBoundIsHigherThanItsUpperBound() throws Exception {
        mockMvc.perform(versioned(get(BASE_PATH))
                        .param("minPrice", "100.00")
                        .param("maxPrice", "10.00"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.minPrice").value("must be lower than or equal to maxPrice"));

        verifyNoInteractions(productSearchService);
    }

    @Test
    void rejectsANegativeLowerPriceWithAFieldMessage() throws Exception {
        mockMvc.perform(versioned(get(BASE_PATH))
                        .param("minPrice", "-1.00"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.minPrice").exists());

        verifyNoInteractions(productSearchService);
    }

    @Test
    void rejectsANegativeUpperPriceWithAFieldMessage() throws Exception {
        mockMvc.perform(versioned(get(BASE_PATH))
                        .param("maxPrice", "-1.00"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.maxPrice").exists());

        verifyNoInteractions(productSearchService);
    }

    @Test
    void rejectsAnUnknownSortFieldWithTheSortKey() throws Exception {
        mockMvc.perform(versioned(get(BASE_PATH))
                        .param("sort", "unknown"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.sort").value("Unsupported sort field: unknown"));

        verifyNoInteractions(productSearchService);
    }

    @Test
    void acceptsASupportedSortField() throws Exception {
        when(productSearchService.search(any(), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(new ProductSearchResult(
                        new PageImpl<>(List.of(), PageRequest.of(0, 20), 0),
                        Map.of(),
                        PriceBounds.empty()
                ));

        mockMvc.perform(versioned(get(BASE_PATH))
                        .param("sort", "price,desc"))
                .andExpect(status().isOk());
    }

    @Test
    void returnsTheIndexedProduct() throws Exception {
        ProductSearchDocument document = documentWithId(7L);
        when(productSearchService.findById(7L)).thenReturn(Optional.of(document));
        when(productSearchMapper.toOutputDto(document)).thenReturn(outputWithId(7L));

        mockMvc.perform(versioned(get(BASE_PATH + "/7")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7));
    }

    @Test
    void returnsNotFoundWhenTheProductIsNotIndexed() throws Exception {
        when(productSearchService.findById(99L)).thenReturn(Optional.empty());

        String body = mockMvc.perform(versioned(get(BASE_PATH + "/99")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertThat(body).doesNotContain("Product not found with id");
        verify(productSearchMapper, never()).toOutputDto(any());
    }

    @Test
    void createsTheProductInTheDatabaseAndPointsToItsSearchResource() throws Exception {
        Product product = productWithId(null);
        Product createdProduct = productWithId(7L);
        when(productSearchMapper.toEntity(any(ProductSearchInputDTO.class))).thenReturn(product);
        when(productsService.create(product)).thenReturn(createdProduct);
        when(productOutputMapper.toDTO(createdProduct)).thenReturn(outputWithId(7L));

        mockMvc.perform(versioned(post(BASE_PATH))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload()))
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.LOCATION,
                        ApiVersionTestSupport.url(defaultVersion, CONTROLLER_PATH + "/7")))
                .andExpect(jsonPath("$.id").value(7));

        ArgumentCaptor<ProductSearchInputDTO> captor =
                ArgumentCaptor.forClass(ProductSearchInputDTO.class);
        verify(productSearchMapper).toEntity(captor.capture());

        assertThat(captor.getValue().getName()).isEqualTo("Mechanical keyboard");
        assertThat(captor.getValue().getCategories()).containsExactly(1L);
    }

    @Test
    void updatesTheProductInTheDatabase() throws Exception {
        Product product = productWithId(null);
        Product updatedProduct = productWithId(7L);
        when(productSearchMapper.toEntity(any(ProductSearchInputDTO.class))).thenReturn(product);
        when(productsService.update(7L, product)).thenReturn(updatedProduct);
        when(productOutputMapper.toDTO(updatedProduct)).thenReturn(outputWithId(7L));

        mockMvc.perform(versioned(put(BASE_PATH + "/7"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7));

        verify(productsService).update(7L, product);
    }

    @Test
    void deletesTheProductFromTheDatabase() throws Exception {
        mockMvc.perform(versioned(delete(BASE_PATH + "/7")))
                .andExpect(status().isNoContent());

        verify(productsService).delete(7L);
    }

    @Test
    void rebuildsTheSearchIndex() throws Exception {
        when(productSearchService.reindex()).thenReturn(12L);

        mockMvc.perform(versioned(post(BASE_PATH + "/reindex")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.indexName").value("products"))
                .andExpect(jsonPath("$.indexed").value(12));
    }

    @Test
    void rejectsAnIncompleteProductPayload() throws Exception {
        mockMvc.perform(versioned(post(BASE_PATH))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\" \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.name").exists());

        verifyNoInteractions(productsService);
    }

    @Test
    void rejectsAnImageReferenceThatIsNeitherALinkNorARelativeRoute() throws Exception {
        mockMvc.perform(versioned(post(BASE_PATH))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload().replace(
                                "/images/keyboard.png",
                                "javascript:alert(1)"
                        )))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.imageUrl").exists());

        verifyNoInteractions(productsService);
    }

    /**
     * Adds the version the application serves by default to a request that does not select one.
     *
     * @param request request of the test
     *
     * @return the same request with the default version, which the mock builder writes into the path
     */
    private MockHttpServletRequestBuilder versioned(MockHttpServletRequestBuilder request) {
        return request.apiVersion(defaultVersion);
    }

    private static ProductSearchDocument documentWithId(Long id) {
        ProductSearchDocument document = new ProductSearchDocument();
        document.setId(id);

        return document;
    }

    private static ProductOutputDTO outputWithId(Long id) {
        ProductOutputDTO output = new ProductOutputDTO();
        output.setId(id);

        return output;
    }

    private static Product productWithId(Long id) {
        Product product = new Product();
        product.setId(id);

        return product;
    }

    private static String validPayload() {
        return """
                {
                  "name": "Mechanical keyboard",
                  "description": "Hot swappable keyboard",
                  "sku": "KB-001",
                  "price": 59.90,
                  "salePrice": 49.90,
                  "stockQuantity": 12,
                  "brand": "Acme",
                  "imageUrl": "/images/keyboard.png",
                  "imageUrls": ["/images/keyboard-1.png"],
                  "categories": [1],
                  "active": true
                }
                """;
    }
}
