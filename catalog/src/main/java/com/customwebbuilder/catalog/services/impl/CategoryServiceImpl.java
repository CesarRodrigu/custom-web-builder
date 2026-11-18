package com.customwebbuilder.catalog.services.impl;

import com.customwebbuilder.catalog.logging.LoggingKeys;
import com.customwebbuilder.catalog.models.Category;
import com.customwebbuilder.catalog.repositories.CategoryRepository;
import com.customwebbuilder.catalog.services.CategoryService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Database backed implementation of the category persistence.
 *
 * <p>It resolves categories by their natural key and creates the missing ones, so the write path never has to know
 * whether a category already existed.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;


    @Override
    @Transactional(readOnly = false)
    public Category findOrCreate(String name) {
        Optional<Category> existingCategory = categoryRepository.findByName(name);

        if (existingCategory.isPresent()) {
            log.atDebug()
                    .addKeyValue(LoggingKeys.EVENT, "category_reused")
                    .addKeyValue("categoryId", existingCategory.get().getId())
                    .addKeyValue("categoryName", name)
                    .log("Reused the existing category");

            return existingCategory.get();
        }

        Category createdCategory = categoryRepository.save(newCategory(name));

        log.atInfo()
                .addKeyValue(LoggingKeys.EVENT, "category_created")
                .addKeyValue("categoryId", createdCategory.getId())
                .addKeyValue("categoryName", name)
                .log("Category created");


        return createdCategory;
    }

    @Override
    public Category findByName(String name) {
        Optional<Category> category = categoryRepository.findByName(name);

        if (category.isEmpty()) {
            log.atDebug()
                    .addKeyValue(LoggingKeys.EVENT, "category_lookup_missed")
                    .addKeyValue("categoryName", name)
                    .log("Category not found");

            throw new EntityNotFoundException(
                    "Category not found with name: " + name
            );
        }

        return category.get();
    }

    @Override
    public boolean existsById(Long id) {
        return categoryRepository.existsById(id);
    }


    /**
     * Builds a transient category carrying only its name, ready to be persisted.
     *
     * @param name category name
     *
     * @return a new, unsaved category
     */
    private static Category newCategory(String name) {
        Category category = new Category();
        category.setName(name);
        return category;
    }
}
