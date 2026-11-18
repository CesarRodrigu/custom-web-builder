package com.customwebbuilder.catalog.mappers;

import com.customwebbuilder.catalog.BaseTest;
import com.customwebbuilder.catalog.models.Category;
import com.customwebbuilder.catalog.models.Product;
import com.customwebbuilder.catalog.models.dtos.input.ProductInputDTO;
import com.customwebbuilder.catalog.repositories.CategoryRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ProductInputMapper}, covering both mapping directions and the category lookup that resolves
 * every category id into its entity.
 */
@ExtendWith(MockitoExtension.class)
class ProductInputMapperTest extends BaseTest {

    @Mock
    private CategoryRepository categoryRepository;

    private ProductInputMapper mapper;

    @BeforeEach
    void setUp() {
        ProductInputMapperImpl implementation = new ProductInputMapperImpl();
        ReflectionTestUtils.setField(implementation, "categoryRepository", categoryRepository);
        mapper = implementation;
    }

    @Test
    void mapsTheNameAndTheActiveFlagFromTheInputDto() {
        ProductInputDTO dto = inputDto("Mechanical keyboard", Set.of());
        dto.setActive(false);

        Product product = mapper.toEntity(dto);

        assertThat(product.getName()).isEqualTo("Mechanical keyboard");
        assertThat(product.getActive()).isFalse();
        assertThat(product.getCategories()).isEmpty();
    }

    private static ProductInputDTO inputDto(String name, Set<Long> categoryIds) {
        ProductInputDTO dto = new ProductInputDTO();
        dto.setName(name);
        dto.setCategories(categoryIds);
        return dto;
    }

    @Test
    void resolvesEveryCategoryIdToItsCategoryEntity() {
        Category peripherals = category(1L, "Peripherals");
        Category audio = category(2L, "Audio");
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(peripherals));
        when(categoryRepository.findById(2L)).thenReturn(Optional.of(audio));

        Product product = mapper.toEntity(inputDto("Studio headphones", new LinkedHashSet<>(List.of(1L, 2L))));

        assertThat(product.getCategories()).containsExactly(peripherals, audio);
        verify(categoryRepository).findById(1L);
        verify(categoryRepository).findById(2L);
    }

    private static Category category(Long id, String name) {
        Category category = new Category();
        category.setId(id);
        category.setName(name);
        return category;
    }

    @Test
    void failsWhenAReferencedCategoryDoesNotExist() {
        when(categoryRepository.findById(9L)).thenReturn(Optional.empty());

        ProductInputDTO dto = inputDto("Webcam", Set.of(9L));

        assertThatThrownBy(() -> mapper.toEntity(dto))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Category not found with id: 9");
    }

    @Test
    void leavesTheCategoriesAsNullWhenTheInputDtoCarriesNone() {
        ProductInputDTO dto = inputDto("Mousepad", null);

        Product product = mapper.toEntity(dto);

        assertThat(product.getCategories()).isNull();
        verifyNoInteractions(categoryRepository);
    }

    @Test
    void leavesNullCategoryIdsUnresolved() {
        ProductInputDTO dto = inputDto("Cable", new LinkedHashSet<>(Collections.singletonList(null)));

        Product product = mapper.toEntity(dto);

        assertThat(product.getCategories()).containsOnlyNulls();
        verifyNoInteractions(categoryRepository);
    }

    @Test
    void returnsNullWhenTheInputDtoIsNull() {
        assertThat(mapper.toEntity(null)).isNull();
        verifyNoInteractions(categoryRepository);
    }

    @Test
    void mapsTheEntityBackToTheInputDtoUsingTheCategoryIds() {
        Product product = new Product();
        product.setName("External SSD");
        product.setActive(true);
        product.setCategories(new LinkedHashSet<>(List.of(category(4L, "Storage"))));

        ProductInputDTO dto = mapper.toDTO(product);

        assertThat(dto.getName()).isEqualTo("External SSD");
        assertThat(dto.getActive()).isTrue();
        assertThat(dto.getCategories()).containsExactly(4L);
        verifyNoInteractions(categoryRepository);
    }

    @Test
    void returnsNullWhenTheEntityIsNull() {
        assertThat(mapper.toDTO(null)).isNull();
        verifyNoInteractions(categoryRepository);
    }

    @Test
    void leavesTheCategoriesAsNullWhenTheEntityCarriesNone() {
        Product product = new Product();
        product.setCategories(null);

        ProductInputDTO dto = mapper.toDTO(product);

        assertThat(dto.getCategories()).isNull();
        verifyNoInteractions(categoryRepository);
    }

    @Test
    void keepsNullCategoryEntriesNull() {
        Product product = new Product();
        product.setCategories(new LinkedHashSet<>(Collections.singletonList(null)));

        ProductInputDTO dto = mapper.toDTO(product);

        assertThat(dto.getCategories()).containsOnlyNulls();
        verifyNoInteractions(categoryRepository);
    }

    @Test
    void mapsEveryEntityOfTheListKeepingTheOrder() {
        Product mouse = new Product();
        mouse.setName("Mouse");
        Product keyboard = new Product();
        keyboard.setName("Keyboard");

        List<ProductInputDTO> dtos = mapper.toDTOs(List.of(mouse, keyboard));

        assertThat(dtos).extracting(ProductInputDTO::getName).containsExactly("Mouse", "Keyboard");
    }

    @Test
    void mapsEveryInputDtoOfTheListKeepingTheOrder() {
        List<Product> products = mapper.toEntities(List.of(
                inputDto("Mouse", Set.of()),
                inputDto("Keyboard", Set.of())
        ));

        assertThat(products).extracting(Product::getName).containsExactly("Mouse", "Keyboard");
    }

    @Test
    void returnsNullWhenTheListToMapIsNull() {
        assertThat(mapper.toDTOs(null)).isNull();
        assertThat(mapper.toEntities(null)).isNull();
    }
}
