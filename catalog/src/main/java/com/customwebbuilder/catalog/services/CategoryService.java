package com.customwebbuilder.catalog.services;

import com.customwebbuilder.catalog.models.Category;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Category persistence contract, backed by the database.
 *
 * <p>Categories have no endpoint of their own: they are created while a product is seeded or stored, which is why the
 * interface only offers the lookups the write path needs.
 */
@Service
@Transactional(readOnly = true)
public interface CategoryService {

    /**
     * Returns the category with the given name, creating it when it does not exist yet. Seeding endpoints call it to
     * resolve a category by name without duplicating rows.
     *
     * @param name category name to look up, case sensitive
     *
     * @return the persisted category, never null
     */
    @Transactional(readOnly = false)
    Category findOrCreate(String name);

    /**
     * Returns the category with the given name.
     *
     * @param name exact name of the category to look up
     *
     * @return the persisted category, never null
     *
     * @throws jakarta.persistence.EntityNotFoundException when no category uses that name
     */
    Category findByName(String name);


    boolean existsById(Long id);
}
