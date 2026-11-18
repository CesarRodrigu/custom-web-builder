package com.customwebbuilder.catalog.services;

import com.customwebbuilder.catalog.models.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Product persistence contract, backed by the database.
 *
 * <p>It is the entry point every consumer uses to read or write products, and it is also the seam where the search
 * mirroring is added: the primary bean is a decorator that wraps the relational implementation, so calling this
 * interface writes the relational store and mirrors the committed change into OpenSearch. Implementations therefore
 * declare nothing about the index, and a caller must not inject the relational implementation directly.
 *
 * <p>Every method is transactional and read only unless it is annotated otherwise.
 */
@Service
@Transactional(readOnly = true)
public interface ProductsService {

    /**
     * Returns every product of the catalog.
     *
     * <p>It is meant for debugging and for a full rebuild of the search index, not for a client request, because the
     * response has no pagination.
     *
     * @return all the products with their categories and their gallery loaded
     */
    @Transactional(readOnly = true, timeout = 5)
    List<Product> findAll();

    /**
     * Returns one page of products.
     *
     * @param pageable page index, page size and ordering to apply
     *
     * @return the requested page with the pagination metadata
     */
    @Transactional(readOnly = true, timeout = 5)
    Page<Product> findAll(Pageable pageable);

    /**
     * Returns one page of products linked to the given category.
     *
     * @param categoryName exact name of the category used as filter
     * @param pageable     page index, page size and ordering to apply
     *
     * @return the requested page of products with their categories loaded, never null
     */
    Page<Product> findByCategoryName(String categoryName, Pageable pageable);

    /**
     * Returns one product with its collections loaded.
     *
     * @param id identifier of the product
     *
     * @return the matching product
     *
     * @throws jakarta.persistence.EntityNotFoundException when no product uses the given identifier
     */
    Product findById(Long id);

    /**
     * Looks a product up by its natural key.
     *
     * @param sku exact stock keeping unit
     *
     * @return the matching product, or empty when no product uses that SKU
     */
    Optional<Product> findBySku(String sku);

    /**
     * Persists a new product and its categories.
     *
     * @param product transient product to store
     *
     * @return the persisted product, with the identifier and the timestamps already assigned
     */
    @Transactional(readOnly = false)
    Product create(Product product);

    /**
     * Applies the values of the given product onto the stored one.
     *
     * <p>Only the non-null properties of the source are copied, and the collections that describe the product replace
     * the stored ones. The entity is updated in place so its identifier never changes.
     *
     * @param id             identifier of the product to update
     * @param updatedProduct product carrying the new values
     *
     * @return the persisted product with the applied values
     *
     * @throws jakarta.persistence.EntityNotFoundException when no product uses the given identifier
     */
    @Transactional(readOnly = false)
    Product update(Long id, Product updatedProduct);

    /**
     * Removes a product and its gallery links.
     *
     * @param id identifier of the product to delete
     */
    @Transactional(readOnly = false)
    void delete(Long id);
}
