package com.customwebbuilder.catalog.mappers;

import com.customwebbuilder.catalog.BaseTest;
import com.customwebbuilder.catalog.models.Category;
import com.customwebbuilder.catalog.models.Product;
import com.customwebbuilder.catalog.models.dtos.output.CategoryOutputDTO;
import com.customwebbuilder.catalog.models.dtos.output.ProductOutputDTO;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

/**
 * Unit tests for {@link ProductOutputMapper}, covering the product fields, the nested category mapping and both
 * directions of the mapper.
 */
class ProductOutputMapperTest extends BaseTest {

    private final ProductOutputMapper mapper = new ProductOutputMapperImpl();

    @Test
    void mapsEveryProductFieldToTheOutputDto() {
        Instant createdAt = Instant.parse("2026-01-15T10:15:30Z");
        Instant updatedAt = Instant.parse("2026-02-20T08:00:00Z");
        Product product = new Product();
        product.setId(12L);
        product.setName("Studio headphones");
        product.setActive(false);
        product.setCreatedAt(createdAt);
        product.setUpdatedAt(updatedAt);

        ProductOutputDTO dto = mapper.toDTO(product);

        assertThat(dto.getId()).isEqualTo(12L);
        assertThat(dto.getName()).isEqualTo("Studio headphones");
        assertThat(dto.getActive()).isFalse();
        assertThat(dto.getCreatedAt()).isEqualTo(createdAt);
        assertThat(dto.getUpdatedAt()).isEqualTo(updatedAt);
    }

    @Test
    void mapsTheCategoriesWithTheirIdAndName() {
        Product product = productWithCategories(category(3L, "Audio"), category(5L, "Peripherals"));

        ProductOutputDTO dto = mapper.toDTO(product);

        assertThat(dto.getCategories())
                .extracting(CategoryOutputDTO::getId, CategoryOutputDTO::getName)
                .containsExactly(tuple(3L, "Audio"), tuple(5L, "Peripherals"));
    }

    private static Product productWithCategories(Category... categories) {
        Product product = new Product();
        product.setCategories(new LinkedHashSet<>(List.of(categories)));
        return product;
    }

    private static Category category(Long id, String name) {
        Category category = new Category();
        category.setId(id);
        category.setName(name);
        return category;
    }

    @Test
    void mapsAnEmptyCategoryCollectionToAnEmptySet() {
        Product product = productWithCategories();

        ProductOutputDTO dto = mapper.toDTO(product);

        assertThat(dto.getCategories()).isEmpty();
    }

    @Test
    void returnsNullWhenTheEntityIsNull() {
        assertThat(mapper.toDTO(null)).isNull();
    }

    @Test
    void mapsTheOutputDtoBackToTheEntity() {
        Instant createdAt = Instant.parse("2026-03-01T09:30:00Z");
        ProductOutputDTO dto = new ProductOutputDTO();
        dto.setId(8L);
        dto.setName("Curved monitor");
        dto.setActive(true);
        dto.setCreatedAt(createdAt);
        dto.setUpdatedAt(createdAt);
        dto.setCategories(new LinkedHashSet<>(List.of(categoryOutputDto(11L, "Displays"))));

        Product product = mapper.toEntity(dto);

        assertThat(product.getId()).isEqualTo(8L);
        assertThat(product.getName()).isEqualTo("Curved monitor");
        assertThat(product.getActive()).isTrue();
        assertThat(product.getCreatedAt()).isEqualTo(createdAt);
        assertThat(product.getUpdatedAt()).isEqualTo(createdAt);
        assertThat(product.getCategories())
                .extracting(Category::getId, Category::getName)
                .containsExactly(tuple(11L, "Displays"));
    }

    private static CategoryOutputDTO categoryOutputDto(Long id, String name) {
        CategoryOutputDTO dto = new CategoryOutputDTO();
        dto.setId(id);
        dto.setName(name);
        return dto;
    }

    @Test
    void returnsNullWhenTheOutputDtoIsNull() {
        assertThat(mapper.toEntity(null)).isNull();
    }

    @Test
    void mapsNullCategoryCollectionsToNull() {
        Product product = new Product();
        product.setCategories(null);
        ProductOutputDTO dto = new ProductOutputDTO();
        dto.setCategories(null);

        assertThat(mapper.toDTO(product).getCategories()).isNull();
        assertThat(mapper.toEntity(dto).getCategories()).isNull();
    }

    @Test
    void keepsTheDefaultGalleryWhenTheSourceCarriesNoGallery() {
        Product product = new Product();
        product.setImageUrls(null);
        ProductOutputDTO dto = new ProductOutputDTO();
        dto.setImageUrls(null);

        assertThat(mapper.toDTO(product).getImageUrls()).isEmpty();
        assertThat(mapper.toEntity(dto).getImageUrls()).isEmpty();
    }

    @Test
    void keepsNullCategoryEntriesNull() {
        Product product = new Product();
        product.setCategories(new LinkedHashSet<>(Collections.singletonList(null)));
        ProductOutputDTO dto = new ProductOutputDTO();
        dto.setCategories(new LinkedHashSet<>(Collections.singletonList(null)));

        assertThat(mapper.toDTO(product).getCategories()).containsOnlyNulls();
        assertThat(mapper.toEntity(dto).getCategories()).containsOnlyNulls();
    }

    @Test
    void mapsEveryEntityOfTheListKeepingTheOrder() {
        Product mouse = new Product();
        mouse.setName("Mouse");
        Product keyboard = new Product();
        keyboard.setName("Keyboard");

        List<ProductOutputDTO> dtos = mapper.toDTOs(List.of(mouse, keyboard));

        assertThat(dtos).extracting(ProductOutputDTO::getName).containsExactly("Mouse", "Keyboard");
    }

    @Test
    void mapsEveryOutputDtoOfTheListKeepingTheOrder() {
        ProductOutputDTO mouse = new ProductOutputDTO();
        mouse.setName("Mouse");
        ProductOutputDTO keyboard = new ProductOutputDTO();
        keyboard.setName("Keyboard");

        List<Product> products = mapper.toEntities(List.of(mouse, keyboard));

        assertThat(products).extracting(Product::getName).containsExactly("Mouse", "Keyboard");
    }

    @Test
    void returnsNullWhenTheListToMapIsNull() {
        assertThat(mapper.toDTOs(null)).isNull();
        assertThat(mapper.toEntities(null)).isNull();
    }
}
