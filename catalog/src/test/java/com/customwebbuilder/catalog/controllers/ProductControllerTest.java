package com.customwebbuilder.catalog.controllers;

import com.customwebbuilder.catalog.BaseTest;
import com.customwebbuilder.catalog.mappers.ProductInputMapper;
import com.customwebbuilder.catalog.mappers.ProductOutputMapper;
import com.customwebbuilder.catalog.models.Product;
import com.customwebbuilder.catalog.models.dtos.input.ProductInputDTO;
import com.customwebbuilder.catalog.models.dtos.output.ProductOutputDTO;
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

import java.util.List;

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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Behaviour of {@link ProductController} over the MVC slice, which loads {@code WebConfig} and the API versioning
 * configuration, so the request paths are the ones the application serves.
 *
 * <p>No request path carries the version segment: the mock builder writes it on every request, filled with the
 * version the application serves by default unless the test selects another one with
 * {@link org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder#apiVersion(Object)}.
 *
 * <p>The slice also covers the validation of the query parameters, which the proxy of the controller enforces before
 * the method body runs.
 */
@WebMvcTest(ProductController.class)
@Import(ApiVersionTestSupport.ApiVersionConfiguration.class)
class ProductControllerTest extends BaseTest {

    /**
     * Path declared by the {@code @RequestMapping} of {@link ProductController}.
     */
    private static final String CONTROLLER_PATH = "/product";

    /**
     * Path of the product resource including the prefix added by
     * {@link com.customwebbuilder.catalog.config.WebConfig} and without the version segment, which the mock builder
     * inserts on every request.
     */
    private static final String BASE_PATH = ApiVersionTestSupport.API_PREFIX + CONTROLLER_PATH;

    /**
     * Version the application serves by default, read from the configuration so the tests follow it instead of
     * repeating the number.
     */
    @Value("${spring.mvc.apiversion.default}")
    private String defaultVersion;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProductsService productsService;

    @MockitoBean
    private ProductOutputMapper productOutputMapper;

    @MockitoBean
    private ProductInputMapper productInputMapper;

    @Test
    void returnsTheRequestedPageWithThePaginationMetadata() throws Exception {
        Product product = productWithId(7L);
        ProductOutputDTO dto = outputWithId(7L);

        Pageable pageable = PageRequest.of(1, 2, Sort.by(Sort.Direction.DESC, "price"));
        when(productsService.findByCategoryName("Informática", pageable))
                .thenReturn(new PageImpl<>(List.of(product), pageable, 5));
        when(productOutputMapper.toDTO(product)).thenReturn(dto);

        mockMvc.perform(versioned(get(BASE_PATH + "/search"))
                        .param("category", "Informática")
                        .param("page", "1")
                        .param("size", "2")
                        .param("sort", "price,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(7))
                .andExpect(jsonPath("$.page.number").value(1))
                .andExpect(jsonPath("$.page.size").value(2))
                .andExpect(jsonPath("$.page.totalElements").value(5))
                .andExpect(jsonPath("$.page.totalPages").value(3));
    }

    @Test
    void servesTheVersionSelectedInTheRequest() throws Exception {
        when(productsService.findByCategoryName(eq("Informática"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        mockMvc.perform(get(BASE_PATH + "/search")
                        .apiVersion("1")
                        .param("category", "Informática"))
                .andExpect(status().isOk());
    }

    @Test
    void rejectsAVersionThatIsNotSupportedAndNamesIt() throws Exception {
        mockMvc.perform(get(BASE_PATH + "/search")
                        .apiVersion("2")
                        .param("category", "Informática"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.version").value("Invalid API version: '2.0.0'."));

        verifyNoInteractions(productsService);
    }

    @Test
    void hidesTheCauseOfAnUnexpectedFailure() throws Exception {
        when(productsService.findById(7L))
                .thenThrow(new IllegalStateException("jdbc:postgresql://admin:contra@localhost:5432/app_db"));

        String body = mockMvc.perform(versioned(get(BASE_PATH + "/7")))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Internal Server Error"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertThat(body).doesNotContain("admin:contra");
    }

    @Test
    void appliesTheDefaultPaginationAndOrdering() throws Exception {
        Pageable pageable = PageRequest.of(0, 20);
        when(productsService.findByCategoryName(eq("Informática"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), pageable, 0));

        mockMvc.perform(versioned(get(BASE_PATH + "/search"))
                        .param("category", "Informática"))
                .andExpect(status().isOk());

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(productsService).findByCategoryName(eq("Informática"), captor.capture());

        assertThat(captor.getValue().getPageNumber()).isZero();
        assertThat(captor.getValue().getPageSize()).isEqualTo(20);
        assertThat(captor.getValue().getSort()).isEqualTo(Sort.by(Sort.Direction.ASC, "name"));
    }

    @Test
    void requiresTheCategoryParameter() throws Exception {
        mockMvc.perform(versioned(get(BASE_PATH + "/search")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));
    }

    @Test
    void rejectsABlankCategoryWithAFieldMessage() throws Exception {
        mockMvc.perform(versioned(get(BASE_PATH + "/search"))
                        .param("category", "   "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.category").exists());

        verifyNoInteractions(productsService);
    }

    @Test
    void rejectsAnUnsupportedSortField() throws Exception {
        mockMvc.perform(versioned(get(BASE_PATH + "/search"))
                        .param("category", "Informática")
                        .param("sort", "unknown"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.sort").value("Unsupported sort field: unknown"));

        verifyNoInteractions(productsService);
    }

    @Test
    void returnsTheRequestedPageOfAllProducts() throws Exception {
        Product product = productWithId(7L);
        ProductOutputDTO dto = outputWithId(7L);
        Pageable pageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.ASC, "name"));
        when(productsService.findAll(pageable)).thenReturn(new PageImpl<>(List.of(product), pageable, 1));
        when(productOutputMapper.toDTO(product)).thenReturn(dto);

        mockMvc.perform(versioned(get(BASE_PATH + "/")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(7))
                .andExpect(jsonPath("$.page.totalElements").value(1));
    }

    @Test
    void returnsTheProductWithTheGivenId() throws Exception {
        when(productsService.findById(7L)).thenReturn(productWithId(7L));
        when(productOutputMapper.toDTO(any(Product.class))).thenReturn(outputWithId(7L));

        mockMvc.perform(versioned(get(BASE_PATH + "/7")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7));
    }

    @Test
    void deletesTheProductWithTheGivenId() throws Exception {
        mockMvc.perform(versioned(delete(BASE_PATH + "/7")))
                .andExpect(status().isNoContent());

        verify(productsService).delete(7L);
    }

    @Test
    void createsTheProductAndPointsToItsResource() throws Exception {
        Product transientProduct = productWithId(null);
        when(productInputMapper.toEntity(any(ProductInputDTO.class))).thenReturn(transientProduct);
        when(productsService.create(transientProduct)).thenReturn(productWithId(7L));
        when(productOutputMapper.toDTO(any(Product.class))).thenReturn(outputWithId(7L));

        mockMvc.perform(versioned(post(BASE_PATH + "/"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Mechanical keyboard",
                                  "sku": "KB-001",
                                  "price": 59.90,
                                  "stockQuantity": 12,
                                  "active": true
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.LOCATION, ApiVersionTestSupport.url(defaultVersion, CONTROLLER_PATH + "/7")))
                .andExpect(jsonPath("$.id").value(7));
    }

    @Test
    void rejectsAProductWithoutName() throws Exception {
        mockMvc.perform(versioned(post(BASE_PATH + "/"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": " ",
                                  "sku": "KB-001",
                                  "price": 59.90,
                                  "stockQuantity": 12
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.name").exists());

        verify(productsService, never()).create(any(Product.class));
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

    private static Product productWithId(Long id) {
        Product product = new Product();
        product.setId(id);

        return product;
    }

    private static ProductOutputDTO outputWithId(Long id) {
        ProductOutputDTO dto = new ProductOutputDTO();
        dto.setId(id);

        return dto;
    }
}
