package com.customwebbuilder.catalog.mappers;

import com.customwebbuilder.catalog.BaseTest;
import com.customwebbuilder.catalog.models.Category;
import com.customwebbuilder.catalog.models.Product;
import com.customwebbuilder.catalog.models.dtos.input.ProductSearchInputDTO;
import com.customwebbuilder.catalog.models.dtos.output.ProductOutputDTO;
import com.customwebbuilder.catalog.models.search.CategorySearchDocument;
import com.customwebbuilder.catalog.models.search.ProductSearchDocument;
import com.customwebbuilder.catalog.repositories.CategoryRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link ProductSearchMapper}, covering the mapping between the relational product, the OpenSearch
 * document and the request and response DTOs of the search API.
 */
@ExtendWith(MockitoExtension.class)
class ProductSearchMapperTest extends BaseTest {

    @Mock
    private CategoryRepository categoryRepository;

    private ProductSearchMapper mapper;

    @BeforeEach
    void setUp() {
        ProductSearchMapperImpl implementation = new ProductSearchMapperImpl();
        ReflectionTestUtils.setField(implementation, "categoryRepository", categoryRepository);
        mapper = implementation;
    }

    @Test
    void mapsTheWholeProductIntoTheSearchDocument() {
        Product product = productWithId(7L);
        product.setCategories(new LinkedHashSet<>(List.of(category(1L, "Peripherals"))));

        ProductSearchDocument document = mapper.toDocument(product);

        assertThat(document.getId()).isEqualTo(7L);
        assertThat(document.getName()).isEqualTo("Mechanical keyboard");
        assertThat(document.getDescription()).isEqualTo("Hot swappable keyboard");
        assertThat(document.getSku()).isEqualTo("KB-001");
        assertThat(document.getPrice()).isEqualByComparingTo("59.90");
        assertThat(document.getSalePrice()).isEqualByComparingTo("49.90");
        assertThat(document.getStockQuantity()).isEqualTo(12);
        assertThat(document.getBrand()).isEqualTo("Acme");
        assertThat(document.getImageUrl()).isEqualTo("https://example.com/keyboard.png");
        assertThat(document.getImageUrls())
                .containsExactly("https://example.com/keyboard-1.png", "https://example.com/keyboard-2.png");
        assertThat(document.getActive()).isTrue();
        assertThat(document.getCreatedAt()).isEqualTo(Instant.parse("2026-01-01T10:00:00Z"));
        assertThat(document.getUpdatedAt()).isEqualTo(Instant.parse("2026-01-02T10:00:00Z"));
        assertThat(document.getCategories()).singleElement().satisfies(category -> {
            assertThat(category.getId()).isEqualTo(1L);
            assertThat(category.getName()).isEqualTo("Peripherals");
        });
        verifyNoInteractions(categoryRepository);
    }

    private static Product productWithId(Long id) {
        Product product = new Product();
        product.setId(id);
        product.setName("Mechanical keyboard");
        product.setDescription("Hot swappable keyboard");
        product.setSku("KB-001");
        product.setPrice(new BigDecimal("59.90"));
        product.setSalePrice(new BigDecimal("49.90"));
        product.setStockQuantity(12);
        product.setBrand("Acme");
        product.setImageUrl("https://example.com/keyboard.png");
        product.setImageUrls(new LinkedHashSet<>(List.of(
                "https://example.com/keyboard-1.png",
                "https://example.com/keyboard-2.png"
        )));
        product.setActive(true);
        product.setCreatedAt(Instant.parse("2026-01-01T10:00:00Z"));
        product.setUpdatedAt(Instant.parse("2026-01-02T10:00:00Z"));

        return product;
    }

    private static Category category(Long id, String name) {
        Category category = new Category();
        category.setId(id);
        category.setName(name);

        return category;
    }

    @Test
    void returnsNullWhenTheProductToMapIsNull() {
        assertThat(mapper.toDocument(null)).isNull();
    }

    @Test
    void mapsEveryProductOfTheListKeepingTheOrder() {
        Product keyboard = productWithId(1L);
        Product mouse = productWithId(2L);

        List<ProductSearchDocument> documents = mapper.toDocuments(List.of(keyboard, mouse));

        assertThat(documents).extracting(ProductSearchDocument::getId).containsExactly(1L, 2L);
    }

    @Test
    void returnsNullWhenTheProductListIsNull() {
        assertThat(mapper.toDocuments(null)).isNull();
    }

    @Test
    void mapsTheWholeInputDtoIntoANewProduct() {
        ProductSearchInputDTO dto = inputDto();
        Category peripherals = category(1L, "Peripherals");
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(peripherals));

        Product product = mapper.toEntity(dto);

        assertThat(product.getId()).isNull();
        assertThat(product.getName()).isEqualTo("Mechanical keyboard");
        assertThat(product.getDescription()).isEqualTo("Hot swappable keyboard");
        assertThat(product.getSku()).isEqualTo("KB-001");
        assertThat(product.getPrice()).isEqualByComparingTo("59.90");
        assertThat(product.getSalePrice()).isEqualByComparingTo("49.90");
        assertThat(product.getStockQuantity()).isEqualTo(12);
        assertThat(product.getBrand()).isEqualTo("Acme");
        assertThat(product.getImageUrl()).isEqualTo("https://example.com/keyboard.png");
        assertThat(product.getImageUrls())
                .containsExactly("https://example.com/keyboard-1.png", "https://example.com/keyboard-2.png");
        assertThat(product.getActive()).isTrue();
        assertThat(product.getCategories()).containsExactly(peripherals);
    }

    private static ProductSearchInputDTO inputDto() {
        ProductSearchInputDTO dto = new ProductSearchInputDTO();
        dto.setName("Mechanical keyboard");
        dto.setDescription("Hot swappable keyboard");
        dto.setSku("KB-001");
        dto.setPrice(new BigDecimal("59.90"));
        dto.setSalePrice(new BigDecimal("49.90"));
        dto.setStockQuantity(12);
        dto.setBrand("Acme");
        dto.setImageUrl("https://example.com/keyboard.png");
        dto.setImageUrls(new LinkedHashSet<>(List.of(
                "https://example.com/keyboard-1.png",
                "https://example.com/keyboard-2.png"
        )));
        dto.setActive(true);
        dto.setCategories(new LinkedHashSet<>(List.of(1L)));

        return dto;
    }

    @Test
    void failsWhenAReferencedCategoryDoesNotExist() {
        when(categoryRepository.findById(9L)).thenReturn(Optional.empty());

        ProductSearchInputDTO dto = inputDto();
        dto.setCategories(Set.of(9L));

        assertThatThrownBy(() -> mapper.toEntity(dto))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Category not found with id: 9");
    }

    @Test
    void keepsNullCategoryIdentifiersUnresolved() {
        ProductSearchInputDTO dto = inputDto();
        dto.setCategories(new LinkedHashSet<>(Collections.singletonList(null)));

        Product product = mapper.toEntity(dto);

        assertThat(product.getCategories()).containsOnlyNulls();
        verifyNoInteractions(categoryRepository);
    }

    @Test
    void returnsNullWhenTheInputDtoToMapIsNull() {
        assertThat(mapper.toEntity(null)).isNull();
    }

    @Test
    void mapsTheDocumentIntoTheOutputDto() {
        ProductSearchDocument document = documentWithId(7L);
        document.setCategories(new LinkedHashSet<>(List.of(categoryDocument(1L, "Peripherals"))));

        ProductOutputDTO output = mapper.toOutputDto(document);

        assertThat(output.getId()).isEqualTo(7L);
        assertThat(output.getName()).isEqualTo("Mechanical keyboard");
        assertThat(output.getDescription()).isEqualTo("Hot swappable keyboard");
        assertThat(output.getSku()).isEqualTo("KB-001");
        assertThat(output.getPrice()).isEqualByComparingTo("59.90");
        assertThat(output.getSalePrice()).isEqualByComparingTo("49.90");
        assertThat(output.getStockQuantity()).isEqualTo(12);
        assertThat(output.getBrand()).isEqualTo("Acme");
        assertThat(output.getImageUrl()).isEqualTo("https://example.com/keyboard.png");
        assertThat(output.getImageUrls())
                .containsExactly("https://example.com/keyboard-1.png", "https://example.com/keyboard-2.png");
        assertThat(output.getActive()).isTrue();
        assertThat(output.getCreatedAt()).isEqualTo(Instant.parse("2026-01-01T10:00:00Z"));
        assertThat(output.getUpdatedAt()).isEqualTo(Instant.parse("2026-01-02T10:00:00Z"));
        assertThat(output.getCategories()).singleElement().satisfies(category -> {
            assertThat(category.getId()).isEqualTo(1L);
            assertThat(category.getName()).isEqualTo("Peripherals");
        });
    }

    private static ProductSearchDocument documentWithId(Long id) {
        ProductSearchDocument document = new ProductSearchDocument();
        document.setId(id);
        document.setName("Mechanical keyboard");
        document.setDescription("Hot swappable keyboard");
        document.setSku("KB-001");
        document.setPrice(new BigDecimal("59.90"));
        document.setSalePrice(new BigDecimal("49.90"));
        document.setStockQuantity(12);
        document.setBrand("Acme");
        document.setImageUrl("https://example.com/keyboard.png");
        document.setImageUrls(new LinkedHashSet<>(List.of(
                "https://example.com/keyboard-1.png",
                "https://example.com/keyboard-2.png"
        )));
        document.setActive(true);
        document.setCreatedAt(Instant.parse("2026-01-01T10:00:00Z"));
        document.setUpdatedAt(Instant.parse("2026-01-02T10:00:00Z"));

        return document;
    }

    private static CategorySearchDocument categoryDocument(Long id, String name) {
        CategorySearchDocument document = new CategorySearchDocument();
        document.setId(id);
        document.setName(name);

        return document;
    }

    @Test
    void returnsNullWhenTheDocumentToMapIsNull() {
        assertThat(mapper.toOutputDto(null)).isNull();
    }

    @Test
    void mapsEveryDocumentOfTheListKeepingTheOrder() {
        List<ProductOutputDTO> outputs = mapper.toOutputDtos(List.of(
                documentWithId(1L),
                documentWithId(2L)
        ));

        assertThat(outputs).extracting(ProductOutputDTO::getId).containsExactly(1L, 2L);
    }

    @Test
    void returnsNullWhenTheDocumentListIsNull() {
        assertThat(mapper.toOutputDtos(null)).isNull();
    }

    @Test
    void leavesTheGalleryOfTheDocumentEmptyAndTheCategoriesUnsetWhenTheProductCarriesNone() {
        Product product = productWithId(7L);
        product.setImageUrls(null);
        product.setCategories(null);

        ProductSearchDocument document = mapper.toDocument(product);

        assertThat(document.getImageUrls()).isEmpty();
        assertThat(document.getCategories()).isNull();
    }

    @Test
    void keepsANullElementOfTheProductCategorySetAsNull() {
        Product product = productWithId(7L);
        product.setCategories(new LinkedHashSet<>(Collections.singletonList(null)));

        ProductSearchDocument document = mapper.toDocument(product);

        assertThat(document.getCategories()).containsOnlyNulls();
    }

    @Test
    void leavesTheGalleryOfTheNewProductEmptyAndTheCategoriesUnsetWhenThePayloadCarriesNone() {
        ProductSearchInputDTO dto = inputDto();
        dto.setImageUrls(null);
        dto.setCategories(null);

        Product product = mapper.toEntity(dto);

        assertThat(product.getImageUrls()).isEmpty();
        assertThat(product.getCategories()).isNull();
        verifyNoInteractions(categoryRepository);
    }

    @Test
    void leavesTheGalleryOfTheResponseEmptyAndTheCategoriesUnsetWhenTheDocumentCarriesNone() {
        ProductSearchDocument document = documentWithId(7L);
        document.setImageUrls(null);
        document.setCategories(null);

        ProductOutputDTO output = mapper.toOutputDto(document);

        assertThat(output.getImageUrls()).isEmpty();
        assertThat(output.getCategories()).isNull();
    }

    @Test
    void keepsANullElementOfTheDocumentCategorySetAsNull() {
        ProductSearchDocument document = documentWithId(7L);
        document.setCategories(new LinkedHashSet<>(Collections.singletonList(null)));

        ProductOutputDTO output = mapper.toOutputDto(document);

        assertThat(output.getCategories()).containsOnlyNulls();
    }
}
