package com.customwebbuilder.catalog.services;

import com.customwebbuilder.catalog.BaseTest;
import com.customwebbuilder.catalog.models.Category;
import com.customwebbuilder.catalog.models.Product;
import com.customwebbuilder.catalog.repositories.CategoryRepository;
import com.customwebbuilder.catalog.repositories.ProductRepository;
import com.customwebbuilder.catalog.services.impl.ProductsServiceImpl;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductsServiceImplTest extends BaseTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private ProductsServiceImpl productsService;

    @Test
    void returnsThePageWithThePaginationMetadataFromTheRepository() {
        Pageable pageable = PageRequest.of(0, 2, Sort.by("name"));
        Page<Product> expected = new PageImpl<>(List.of(productWithId(1L), productWithId(2L)), pageable, 5);
        when(productRepository.findByCategoryName("Informática", pageable)).thenReturn(expected);

        Page<Product> result = productsService.findByCategoryName("Informática", pageable);

        assertThat(result.getContent()).extracting(Product::getId).containsExactly(1L, 2L);
        assertThat(result.getTotalElements()).isEqualTo(5);
        assertThat(result.getNumber()).isZero();
        assertThat(result.getSize()).isEqualTo(2);
    }

    private static Product productWithId(Long id) {
        Product product = new Product();
        product.setId(id);
        product.setCategories(new HashSet<>());
        return product;
    }

    @Test
    void loadsTheCategoriesOfTheProductsInThePage() {
        Pageable pageable = PageRequest.of(0, 2);
        Page<Product> page = new PageImpl<>(List.of(productWithId(1L), productWithId(2L)), pageable, 2);
        when(productRepository.findByCategoryName("Informática", pageable)).thenReturn(page);

        productsService.findByCategoryName("Informática", pageable);

        verify(productRepository).findWithCategoriesByIdIn(List.of(1L, 2L));
    }

    @Test
    void loadsTheCategoriesOfEveryProductOfThePage() {
        Pageable pageable = PageRequest.of(0, 2);
        Page<Product> page = new PageImpl<>(List.of(productWithId(1L), productWithId(2L)), pageable, 2);
        when(productRepository.findAll(pageable)).thenReturn(page);

        Page<Product> result = productsService.findAll(pageable);

        assertThat(result).isSameAs(page);
        verify(productRepository).findWithCategoriesByIdIn(List.of(1L, 2L));
    }

    @Test
    void skipsTheCategoryLoadWhenTheCategoryHasNoProducts() {
        Pageable pageable = PageRequest.of(0, 2);
        Page<Product> page = new PageImpl<>(List.of(), pageable, 0);
        when(productRepository.findByCategoryName("Desconocida", pageable)).thenReturn(page);

        Page<Product> result = productsService.findByCategoryName("Desconocida", pageable);

        assertThat(result.getContent()).isEmpty();
        verify(productRepository, never()).findWithCategoriesByIdIn(any());
    }

    @Test
    void savesTheProductWithItsCategories() {
        Product product = productWithId(null);
        Product stored = productWithId(5L);
        when(productRepository.save(product)).thenReturn(stored);

        Product result = productsService.create(product);

        assertThat(result.getId()).isEqualTo(5L);
        verify(categoryRepository).saveAll(product.getCategories());
    }

    @Test
    void copiesTheEditableFieldsOfTheUpdatedProduct() {
        Product stored = productWithId(7L);
        Product update = productWithId(null);
        update.setName("Teclado");
        when(productRepository.findWithCategoriesById(7L)).thenReturn(Optional.of(stored));
        when(productRepository.save(stored)).thenReturn(stored);

        Product result = productsService.update(7L, update);

        assertThat(result.getName()).isEqualTo("Teclado");
    }

    @Test
    void rejectsTheUpdateOfAMissingProduct() {
        when(productRepository.findWithCategoriesById(8L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productsService.update(8L, productWithId(null)))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("8");

        verify(productRepository, never()).save(any());
    }

    @Test
    void deletesTheProductById() {
        productsService.delete(3L);

        verify(productRepository).deleteById(3L);
    }

    @Test
    void returnsEveryProductWithoutPagination() {
        Product stored = productWithId(1L);
        when(productRepository.findAll()).thenReturn(List.of(stored));

        List<Product> result = productsService.findAll();

        assertThat(result).containsExactly(stored);
    }

    @Test
    void returnsTheProductWithTheGivenId() {
        Product stored = productWithId(7L);
        when(productRepository.findWithCategoriesById(7L)).thenReturn(Optional.of(stored));

        Product result = productsService.findById(7L);

        assertThat(result).isSameAs(stored);
    }

    @Test
    void rejectsTheLookupOfAMissingProduct() {
        when(productRepository.findWithCategoriesById(8L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productsService.findById(8L))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("8");
    }

    @Test
    void looksUpTheProductByItsSku() {
        Product stored = productWithId(3L);
        when(productRepository.findBySku("KB-001")).thenReturn(Optional.of(stored));

        assertThat(productsService.findBySku("KB-001")).containsSame(stored);
    }

    @Test
    void returnsAnEmptyLookupWhenNoProductUsesTheSku() {
        when(productRepository.findBySku("UNKNOWN")).thenReturn(Optional.empty());

        assertThat(productsService.findBySku("UNKNOWN")).isEmpty();
    }

    @Test
    void copiesEveryFieldCarriedByTheUpdatedProduct() {
        Product stored = productWithId(7L);
        Product update = fullySpecifiedProduct();
        when(productRepository.findWithCategoriesById(7L)).thenReturn(Optional.of(stored));
        when(productRepository.save(stored)).thenReturn(stored);

        Product result = productsService.update(7L, update);

        assertThat(result.getName()).isEqualTo("Teclado");
        assertThat(result.getDescription()).isEqualTo("Teclado mecánico");
        assertThat(result.getSku()).isEqualTo("KB-002");
        assertThat(result.getPrice()).isEqualByComparingTo("69.90");
        assertThat(result.getSalePrice()).isEqualByComparingTo("59.90");
        assertThat(result.getStockQuantity()).isEqualTo(4);
        assertThat(result.getBrand()).isEqualTo("Keychron");
        assertThat(result.getImageUrl()).isEqualTo("/images/keyboard.png");
        assertThat(result.getImageUrls()).containsExactly("/images/keyboard-1.png");
        assertThat(result.getActive()).isFalse();
        assertThat(result.getCategories()).isEqualTo(update.getCategories());
    }

    private static Product fullySpecifiedProduct() {
        Product product = new Product();
        product.setName("Teclado");
        product.setDescription("Teclado mecánico");
        product.setSku("KB-002");
        product.setPrice(new BigDecimal("69.90"));
        product.setSalePrice(new BigDecimal("59.90"));
        product.setStockQuantity(4);
        product.setBrand("Keychron");
        product.setImageUrl("/images/keyboard.png");
        product.setImageUrls(new HashSet<>(Set.of("/images/keyboard-1.png")));
        product.setActive(false);
        product.setCategories(new HashSet<>(Set.of(categoryWithId(1L, "Informática"))));

        return product;
    }

    private static Category categoryWithId(Long id, String name) {
        Category category = new Category();
        category.setId(id);
        category.setName(name);
        return category;
    }

    @Test
    void keepsTheStoredNameSkuAndPriceWhenTheUpdateDoesNotCarryThem() {
        Product stored = productWithId(7L);
        stored.setName("Teclado");
        stored.setDescription("Teclado mecánico");
        stored.setSku("KB-001");
        stored.setPrice(new BigDecimal("59.90"));

        Product update = productWithId(null);
        when(productRepository.findWithCategoriesById(7L)).thenReturn(Optional.of(stored));
        when(productRepository.save(stored)).thenReturn(stored);

        Product result = productsService.update(7L, update);

        assertThat(result.getName()).isEqualTo("Teclado");
        assertThat(result.getDescription()).isEqualTo("Teclado mecánico");
        assertThat(result.getSku()).isEqualTo("KB-001");
        assertThat(result.getPrice()).isEqualByComparingTo("59.90");
    }
}
