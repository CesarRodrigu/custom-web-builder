package com.customwebbuilder.catalog.repositories;

import com.customwebbuilder.catalog.models.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Relational access to the categories stored in the database.
 *
 * <p>Reads are transactional and read only at the interface level; the writing methods inherit the transaction that
 * the service has already opened.
 */
@Repository
@Transactional(readOnly = true)
public interface CategoryRepository extends JpaRepository<Category, Long> {

    /**
     * Looks a category up by its natural key.
     *
     * @param name exact category name, case sensitive
     *
     * @return the matching category, or empty when no category uses that name
     */
    Optional<Category> findByName(String name);
}