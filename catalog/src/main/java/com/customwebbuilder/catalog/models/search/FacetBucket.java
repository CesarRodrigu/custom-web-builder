package com.customwebbuilder.catalog.models.search;

/**
 * One bucket of a search facet.
 *
 * @param key   bucket key as returned by the search engine
 * @param count number of products in the bucket
 */
public record FacetBucket(String key, long count) {
}
