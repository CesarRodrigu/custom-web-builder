package com.customwebbuilder.catalog.models.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Facets computed by the product search.
 *
 * <p>Each constant owns the key used both as the aggregation name sent to OpenSearch and as the field name of the
 * response, so the aggregation and the JSON representation cannot drift apart.
 */
@Getter
@RequiredArgsConstructor
public enum FacetName {

    /**
     * Category facet, keyed as {@code categories} in the response.
     */
    CATEGORY("categories"),

    /**
     * Brand facet, keyed as {@code brands} in the response.
     */
    BRAND("brands"),

    /**
     * Active flag facet, keyed as {@code active} in the response.
     */
    ACTIVE("active"),

    /**
     * Price range facet, keyed as {@code priceRanges} in the response.
     */
    PRICE_RANGE("priceRanges");

    private final String key;
}
