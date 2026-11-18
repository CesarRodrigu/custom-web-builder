package com.customwebbuilder.catalog.services;

import com.customwebbuilder.catalog.BaseTest;
import com.customwebbuilder.catalog.models.Category;
import com.customwebbuilder.catalog.repositories.CategoryRepository;
import com.customwebbuilder.catalog.services.impl.CategoryServiceImpl;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link CategoryServiceImpl}, covering the lookup by natural key, the creation of the missing rows, the
 * rejection of a lookup that has no match and the existence check the category constraint relies on.
 */
@ExtendWith(MockitoExtension.class)
class CategoryServiceImplTest extends BaseTest {

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private CategoryServiceImpl categoryService;

    @Test
    void returnsTheStoredCategoryWithoutPersistingItAgain() {
        Category stored = categoryWithId(1L, "Informática");
        when(categoryRepository.findByName("Informática")).thenReturn(Optional.of(stored));

        Category result = categoryService.findOrCreate("Informática");

        assertThat(result).isSameAs(stored);
        verify(categoryRepository, never()).save(any(Category.class));
    }

    private static Category categoryWithId(Long id, String name) {
        Category category = new Category();
        category.setId(id);
        category.setName(name);
        category.setUuid(UUID.randomUUID());

        return category;
    }

    @Test
    void persistsTheCategoryOnlyWhenItsNameIsUnknown() {
        when(categoryRepository.findByName("Náutica")).thenReturn(Optional.empty());
        when(categoryRepository.save(any(Category.class))).thenAnswer(invocation -> {
            Category category = invocation.getArgument(0);
            category.setId(5L);
            return category;
        });

        Category result = categoryService.findOrCreate("Náutica");

        assertThat(result.getId()).isEqualTo(5L);
        assertThat(result.getName()).isEqualTo("Náutica");
        verify(categoryRepository).save(any(Category.class));
    }

    @Test
    void returnsTheCategoryWithTheGivenName() {
        Category stored = categoryWithId(1L, "Informática");
        when(categoryRepository.findByName("Informática")).thenReturn(Optional.of(stored));

        Category result = categoryService.findByName("Informática");

        assertThat(result).isSameAs(stored);
    }

    @Test
    void rejectsTheLookupOfAMissingCategory() {
        when(categoryRepository.findByName("Desconocida")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoryService.findByName("Desconocida"))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Category not found with name: Desconocida");
    }

    @Test
    void reportsThatAStoredCategoryExists() {
        when(categoryRepository.existsById(1L)).thenReturn(true);

        assertThat(categoryService.existsById(1L)).isTrue();
    }

    @Test
    void reportsThatAMissingCategoryDoesNotExist() {
        when(categoryRepository.existsById(99L)).thenReturn(false);

        assertThat(categoryService.existsById(99L)).isFalse();
    }
}
