package com.customwebbuilder.catalog.services;

import com.customwebbuilder.catalog.models.search.ProductSearchDocument;
import com.customwebbuilder.catalog.models.search.ProductSearchResult;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * Read and rebuild operations of the OpenSearch backed product search.
 *
 * <p>Product writes stay in {@link ProductsService}; this service only reads the search index and rebuilds it from
 * the database.
 */
public interface ProductSearchService {

    /**
     * Searches indexed products by free text, category, active flag and price range.
     *
     * <p>When a text is given it is matched against the name, the description and the brand, and the three matches
     * are combined with OR before being intersected with the category, active and price filters. The facet counts are
     * computed over the same filters, so every bucket describes the documents the page is drawn from. The price bounds
     * are computed over the whole index instead, so the slider keeps stable limits while it is being dragged.
     *
     * @param text     free text to match, ignored when blank
     * @param category exact name of the category used as filter, ignored when blank
     * @param active   active flag used as filter, ignored when null
     * @param minPrice lowest accepted price, ignored when null
     * @param maxPrice highest accepted price, ignored when null
     * @param pageable page index, page size and ordering to apply
     *
     * @return the products of the requested page plus the facet bucket counts and the price bounds
     */
    ProductSearchResult search(String text, String category, Boolean active, BigDecimal minPrice, BigDecimal maxPrice, Pageable pageable);

    /**
     * Returns the indexed document of one product.
     *
     * @param id identifier of the product
     *
     * @return the search document when it is indexed, empty otherwise
     */
    Optional<ProductSearchDocument> findById(Long id);

    /**
     * Rebuilds the search index from the products stored in the database.
     *
     * @return the number of products written into the index
     */
    long reindex();

    /**
     * Creates the index when needed and rebuilds it only when it does not contain any product yet.
     *
     * @return the number of products written during the rebuild, zero when the index already had documents
     */
    long reindexIfEmpty();
}
