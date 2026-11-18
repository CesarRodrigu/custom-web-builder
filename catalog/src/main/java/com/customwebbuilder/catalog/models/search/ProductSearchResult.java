package com.customwebbuilder.catalog.models.search;

import com.customwebbuilder.catalog.models.enums.FacetName;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Map;

/**
 * Result of a product search: the requested page plus the facet counts computed over the same filters.
 *
 * @param products    products of the requested page with their pagination metadata
 * @param facets      bucket counts grouped by facet, with an entry for every known facet
 * @param priceBounds lowest and highest price of the whole index, used as the limits of the price slider
 */
public record ProductSearchResult(
        Page<ProductSearchDocument> products,
        Map<FacetName, List<FacetBucket>> facets,
        PriceBounds priceBounds
) {
}
