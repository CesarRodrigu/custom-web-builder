package com.customwebbuilder.catalog.repositories;

import com.customwebbuilder.catalog.models.Product;
import org.jspecify.annotations.NonNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Relational access to the products stored in the database.
 *
 * <p>The category and gallery collections are lazy, so the queries that feed a response declare an
 * {@link EntityGraph} for them: the entities reach the mapper with their collections initialised and no lazy select is
 * issued per row. Reads are transactional and read only; writes inherit the transaction opened by the service.
 */
@Repository
@Transactional(readOnly = true)
public interface ProductRepository extends JpaRepository<Product, Long> {

    @EntityGraph(attributePaths = {"categories", "imageUrls"})
    @Transactional(timeout = 10, readOnly = true)
    List<Product> findAll();

    @EntityGraph(attributePaths = {"categories", "imageUrls"})
    @Transactional(timeout = 10, readOnly = true)
    Page<Product> findAll(@NonNull Pageable pageable);

    /**
     * Loads one product with its categories and its image gallery already initialised.
     *
     * @param id identifier of the product
     *
     * @return the matching product with its collections loaded, or empty when it does not exist
     */
    @EntityGraph(attributePaths = {"categories", "imageUrls"})
    Optional<Product> findWithCategoriesById(Long id);

    /**
     * Looks a product up by its natural key.
     *
     * @param sku exact stock keeping unit
     *
     * @return the matching product, or empty when no product uses that SKU
     */
    Optional<Product> findBySku(String sku);

    /**
     * Returns the page of products linked to the given category. The category filter is expressed as an {@code exists}
     * subquery so the page size and the ordering are applied by the database without duplicate rows.
     *
     * @param categoryName exact name of the category used as filter
     * @param pageable     page index, page size and ordering to apply
     *
     * @return a page with the matching products and the total count, never null
     */
    @Query("""
            select p
            from Product p
            where exists (
                select c
                from p.categories c
                where c.name = :categoryName
            )
            """)
    Page<Product> findByCategoryName(@Param("categoryName") String categoryName, Pageable pageable);

    /**
     * Loads the categories of the given products in a single query.
     *
     * @param ids identifiers of the products whose categories must be fetched
     *
     * @return the matching products with their categories initialised
     */
    @EntityGraph(attributePaths = {"categories", "imageUrls"})
    @Query("select p from Product p where p.id in :ids")
    List<Product> findWithCategoriesByIdIn(@Param("ids") Collection<Long> ids);
}
