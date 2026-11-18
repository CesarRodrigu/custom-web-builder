package com.customwebbuilder.catalog.services.impl;

import com.customwebbuilder.catalog.logging.LoggingKeys;
import com.customwebbuilder.catalog.models.Product;
import com.customwebbuilder.catalog.models.enums.FacetName;
import com.customwebbuilder.catalog.models.enums.PriceRange;
import com.customwebbuilder.catalog.models.search.FacetBucket;
import com.customwebbuilder.catalog.models.search.PriceBounds;
import com.customwebbuilder.catalog.models.search.ProductSearchDocument;
import com.customwebbuilder.catalog.models.search.ProductSearchResult;
import com.customwebbuilder.catalog.services.ProductSearchIndexer;
import com.customwebbuilder.catalog.services.ProductSearchService;
import com.customwebbuilder.catalog.services.ProductsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.data.client.orhlc.NativeSearchQuery;
import org.opensearch.data.client.orhlc.NativeSearchQueryBuilder;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.index.query.RangeQueryBuilder;
import org.opensearch.search.aggregations.Aggregation;
import org.opensearch.search.aggregations.AggregationBuilders;
import org.opensearch.search.aggregations.Aggregations;
import org.opensearch.search.aggregations.bucket.MultiBucketsAggregation;
import org.opensearch.search.aggregations.bucket.global.Global;
import org.opensearch.search.aggregations.bucket.global.GlobalAggregationBuilder;
import org.opensearch.search.aggregations.bucket.range.RangeAggregationBuilder;
import org.opensearch.search.aggregations.metrics.NumericMetricsAggregation;
import org.opensearch.search.sort.FieldSortBuilder;
import org.opensearch.search.sort.SortBuilder;
import org.opensearch.search.sort.SortBuilders;
import org.opensearch.search.sort.SortOrder;
import org.slf4j.spi.LoggingEventBuilder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.elasticsearch.core.*;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * OpenSearch backed implementation of the product search.
 *
 * <p>Reads and searches are served by the search index. Writes and the source of truth remain in the database, so a
 * full
 * rebuild always starts from {@link ProductsService#findAll(Pageable)}. The search also computes the facet counts with
 * aggregations so the client can offer filters without a second request.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProductSearchServiceImpl implements ProductSearchService {

    private static final String NAME_FIELD = "name";
    private static final String DESCRIPTION_FIELD = "description";
    private static final String BRAND_FIELD = "brand";
    private static final String BRAND_KEYWORD_FIELD = "brand.keyword";
    private static final String CATEGORY_NAME_FIELD = "categories.name";
    private static final String ACTIVE_FIELD = "active";
    private static final String PRICE_FIELD = "price";
    private static final String ID_FIELD = "id";
    private static final String KEYWORD_SUFFIX = ".keyword";

    /**
     * Name of the global aggregation that holds the price limits. It is global so the filters of the request do not
     * shrink the slider while it is being dragged.
     */
    private static final String PRICE_BOUNDS_AGGREGATION = "priceBounds";

    private static final String PRICE_MIN_AGGREGATION = "min";
    private static final String PRICE_MAX_AGGREGATION = "max";

    /**
     * Number of decimals of the money fields in the index. The metric aggregations return a double, so every amount is
     * normalized to this scale before it leaves the service.
     */
    private static final int MONEY_SCALE = 2;

    /**
     * Number of buckets requested for the facets that are not limited to a small closed set.
     */
    private static final int TERMS_FACET_SIZE = 20;

    /**
     * Number of buckets requested for the active facet, which only has two possible values.
     */
    private static final int ACTIVE_FACET_SIZE = 2;

    /**
     * Number of products read from the database and written into the index per request during a full rebuild. It bounds
     * the heap used by the rebuild and the size of each bulk request.
     */
    private static final int REINDEX_PAGE_SIZE = 50;

    private static final List<String> TEXT_FIELDS = List.of(NAME_FIELD, DESCRIPTION_FIELD, BRAND_FIELD);

    private final ElasticsearchOperations elasticsearchOperations;
    private final ProductsService productsService;
    private final ProductSearchIndexer productSearchIndexer;

    @Override
    public ProductSearchResult search(String text, String category, Boolean active, BigDecimal minPrice, BigDecimal maxPrice, Pageable pageable) {
        long startNanos = System.nanoTime();
        Pageable searchPageable = translate(pageable);
        SearchHits<ProductSearchDocument> searchHits = elasticsearchOperations.search(
                buildQuery(text, category, active, minPrice, maxPrice, searchPageable),
                ProductSearchDocument.class
        );
        Page<ProductSearchDocument> page = SearchHitSupport.searchPageFor(searchHits, searchPageable)
                .map(SearchHit::getContent);
        Map<FacetName, List<FacetBucket>> facets = extractFacets(searchHits);
        PriceBounds priceBounds = extractPriceBounds(searchHits);

        LoggingEventBuilder event = log.atDebug()
                .addKeyValue(LoggingKeys.EVENT, "product_search_executed")
                .addKeyValue("hasText", StringUtils.hasText(text))
                .addKeyValue("page", searchPageable.getPageNumber())
                .addKeyValue("pageSize", searchPageable.getPageSize())
                .addKeyValue("resultCount", page.getNumberOfElements())
                .addKeyValue("totalHits", searchHits.getTotalHits())
                .addKeyValue("facetCount", facets.values().stream().mapToInt(List::size).sum())
                .addKeyValue("priceBoundsMin", priceBounds.min())
                .addKeyValue("priceBoundsMax", priceBounds.max())
                .addKeyValue("durationMs", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos));

        if (StringUtils.hasText(category)) {
            event.addKeyValue("categoryName", category);
        }
        if (active != null) {
            event.addKeyValue("active", active);
        }
        if (minPrice != null) {
            event.addKeyValue("minPrice", minPrice);
        }
        if (maxPrice != null) {
            event.addKeyValue("maxPrice", maxPrice);
        }

        event.log("Executed product search");

        return new ProductSearchResult(page, facets, priceBounds);
    }

    @Override
    @Deprecated
    public Optional<ProductSearchDocument> findById(Long id) {
        if (id == null) {
            log.atDebug()
                    .addKeyValue(LoggingKeys.EVENT, "product_index_lookup_skipped")
                    .addKeyValue("reason", "missing_id")
                    .log("Skipped the product index lookup because the identifier is null");

            return Optional.empty();
        }

        Optional<ProductSearchDocument> document = Optional.ofNullable(
                elasticsearchOperations.get(String.valueOf(id), ProductSearchDocument.class)
        );

        log.atDebug()
                .addKeyValue(LoggingKeys.EVENT, "product_index_lookup")
                .addKeyValue("productId", id)
                .addKeyValue("found", document.isPresent())
                .log("Looked up the product in the search index");

        return document;
    }

    @Override
    public long reindex() {
        productSearchIndexer.recreate();

        long indexed = 0;
        int pageNumber = 0;
        Page<Product> page;

        do {
            page = productsService.findAll(
                    PageRequest.of(pageNumber, REINDEX_PAGE_SIZE, Sort.by(Sort.Direction.ASC, ID_FIELD))
            );
            productSearchIndexer.indexAll(page.getContent());
            indexed += page.getNumberOfElements();
            pageNumber++;
        } while (page.hasNext());

        log.atInfo()
                .addKeyValue(LoggingKeys.EVENT, "search_index_reindexed")
                .addKeyValue("indexName", ProductSearchDocument.INDEX_NAME)
                .addKeyValue("documentCount", indexed)
                .addKeyValue("pageSize", REINDEX_PAGE_SIZE)
                .log("Rebuilt the OpenSearch product index");

        return indexed;
    }

    @Override
    public long reindexIfEmpty() {
        if (!productSearchIndexer.ensureIndex()) {
            return 0;
        }

        long documentCount = productSearchIndexer.count();

        if (documentCount > 0) {
            log.atDebug()
                    .addKeyValue(LoggingKeys.EVENT, "search_index_bootstrap_skipped")
                    .addKeyValue("reason", "index_already_populated")
                    .addKeyValue("documentCount", documentCount)
                    .log("Skipped the search index bootstrap because the index already contains documents");

            return 0;
        }

        return reindex();
    }

    /**
     * Translates the pageable so the ordering references the index fields.
     *
     * @param pageable page index, page size and ordering received from the caller
     *
     * @return the pageable with the ordering translated to the index field names
     */
    private static Pageable translate(Pageable pageable) {
        return PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                translate(pageable.getSort())
        );
    }

    /**
     * Builds the native query with the filters, the ordering, the pagination and the aggregations.
     *
     * <p>Without filters a match-all query is used, because an empty {@link BoolQueryBuilder} does not produce any
     * query. The text is matched against the searchable fields with a multi-match clause, and the category, active and
     * price filters are added as filter clauses of the same boolean query. They are deliberately not registered as a
     * post-filter: the aggregations must be computed over the filtered documents.
     *
     * <p>The facet aggregations are terms buckets for the category, brand and active fields plus a range bucket for
     * the price. A global aggregation adds the lowest and highest price, which are the limits of the slider.
     *
     * @param text     free text to match, ignored when blank
     * @param category exact category name used as filter, ignored when blank
     * @param active   active flag used as filter, ignored when null
     * @param minPrice lowest accepted price, ignored when null
     * @param maxPrice highest accepted price, ignored when null
     * @param pageable page index, page size and ordering already translated to the index fields
     *
     * @return the native query to send to OpenSearch
     */
    private static NativeSearchQuery buildQuery(String text, String category, Boolean active, BigDecimal minPrice, BigDecimal maxPrice, Pageable pageable) {
        NativeSearchQueryBuilder builder = new NativeSearchQueryBuilder()
                .withQuery(buildFilterQuery(text, category, active, minPrice, maxPrice))
                .withSorts(buildSorts(pageable.getSort()))
                .withPageable(pageable);

        builder.withAggregations(
                AggregationBuilders.terms(FacetName.CATEGORY.getKey()).field(CATEGORY_NAME_FIELD).size(TERMS_FACET_SIZE),
                AggregationBuilders.terms(FacetName.BRAND.getKey()).field(BRAND_KEYWORD_FIELD).size(TERMS_FACET_SIZE),
                AggregationBuilders.terms(FacetName.ACTIVE.getKey()).field(ACTIVE_FIELD).size(ACTIVE_FACET_SIZE),
                buildPriceRanges(),
                buildPriceBounds()
        );

        return builder.build();
    }

    /**
     * Extracts the facet buckets from the search response.
     *
     * <p>When the response carries no aggregations, every known facet is returned with an empty list so the response
     * shape does not depend on the search engine being available.
     *
     * @param searchHits response of the search request
     *
     * @return the bucket counts of every facet
     */
    private static Map<FacetName, List<FacetBucket>> extractFacets(SearchHits<ProductSearchDocument> searchHits) {
        Aggregations aggregations = aggregationsOf(searchHits);

        Map<FacetName, List<FacetBucket>> facets = new EnumMap<>(FacetName.class);

        for (FacetName facet : FacetName.values()) {
            facets.put(facet, aggregations == null ? List.of() : bucketsOf(aggregations.get(facet.getKey())));
        }

        return facets;
    }

    /**
     * Extracts the price limits from the search response.
     *
     * @param searchHits response of the search request
     *
     * @return the lowest and highest indexed price, both null when the response has no bounds aggregation or the index
     * is empty
     */
    private static PriceBounds extractPriceBounds(SearchHits<ProductSearchDocument> searchHits) {
        Aggregations aggregations = aggregationsOf(searchHits);

        if (aggregations == null || !(aggregations.get(PRICE_BOUNDS_AGGREGATION) instanceof Global global)) {
            return PriceBounds.empty();
        }

        return new PriceBounds(
                amountOf(global.getAggregations().get(PRICE_MIN_AGGREGATION)),
                amountOf(global.getAggregations().get(PRICE_MAX_AGGREGATION))
        );
    }

    /**
     * Translates a relational ordering into the matching index fields.
     *
     * <p>The name is mapped as a text field with a keyword sub-field, so ordering by name must target
     * {@code name.keyword} to sort the whole value instead of its analyzed terms.
     *
     * @param sort ordering received from the caller
     *
     * @return the ordering translated to the index field names
     */
    private static Sort translate(Sort sort) {
        if (sort.isUnsorted()) {
            return sort;
        }

        List<Sort.Order> orders = sort.stream()
                .map(order -> new Sort.Order(
                        order.getDirection(),
                        translate(order.getProperty()),
                        order.getNullHandling()
                ))
                .toList();

        return Sort.by(orders);
    }

    /**
     * Builds the boolean query with the free text clause and the category, active and price filters.
     *
     * @param text     free text to match, ignored when blank
     * @param category exact category name used as filter, ignored when blank
     * @param active   active flag used as filter, ignored when null
     * @param minPrice lowest accepted price, ignored when null
     * @param maxPrice highest accepted price, ignored when null
     *
     * @return the boolean query, or a match-all query when no filter was requested
     */
    private static QueryBuilder buildFilterQuery(String text, String category, Boolean active, BigDecimal minPrice, BigDecimal maxPrice) {
        BoolQueryBuilder bool = QueryBuilders.boolQuery();

        if (StringUtils.hasText(text)) {
            bool.must(QueryBuilders.multiMatchQuery(text, TEXT_FIELDS.toArray(String[]::new)));
        }

        if (StringUtils.hasText(category)) {
            bool.filter(QueryBuilders.termQuery(CATEGORY_NAME_FIELD, category));
        }

        if (active != null) {
            bool.filter(QueryBuilders.termQuery(ACTIVE_FIELD, active));
        }

        if (minPrice != null || maxPrice != null) {
            RangeQueryBuilder priceRange = QueryBuilders.rangeQuery(PRICE_FIELD);

            if (minPrice != null) {
                priceRange.gte(minPrice);
            }
            if (maxPrice != null) {
                priceRange.lte(maxPrice);
            }

            bool.filter(priceRange);
        }

        return bool.hasClauses() ? bool : QueryBuilders.matchAllQuery();
    }

    /**
     * Translates a relational ordering into the matching index sort builders.
     *
     * @param sort ordering received from the caller
     *
     * @return the sort builders sent to OpenSearch, empty when the ordering is unsorted
     */
    private static List<SortBuilder<?>> buildSorts(Sort sort) {
        List<SortBuilder<?>> sorts = new ArrayList<>();

        for (Sort.Order order : sort) {
            FieldSortBuilder builder = SortBuilders
                    .fieldSort(translate(order.getProperty()))
                    .order(order.isAscending() ? SortOrder.ASC : SortOrder.DESC);

            sorts.add(builder);
        }

        return sorts;
    }

    /**
     * Builds the range aggregation of the price facet.
     *
     * @return the range aggregation with one bucket per {@link PriceRange}
     */
    private static RangeAggregationBuilder buildPriceRanges() {
        RangeAggregationBuilder range = AggregationBuilders
                .range(FacetName.PRICE_RANGE.getKey())
                .field(PRICE_FIELD);

        for (PriceRange priceRange : PriceRange.values()) {
            if (priceRange.getTo() == null) {
                range.addUnboundedFrom(priceRange.getKey(), priceRange.getFrom());
            } else {
                range.addRange(priceRange.getKey(), priceRange.getFrom(), priceRange.getTo());
            }
        }

        return range;
    }

    /**
     * Builds the global aggregation that holds the lowest and highest price of the index.
     *
     * <p>A global aggregation ignores the query, so the limits do not shrink when the request filters by category,
     * active flag or price. That keeps the slider stable while it is being dragged.
     *
     * @return the global aggregation with the min and max sub-aggregations
     */
    private static GlobalAggregationBuilder buildPriceBounds() {
        return AggregationBuilders.global(PRICE_BOUNDS_AGGREGATION)
                .subAggregation(AggregationBuilders.min(PRICE_MIN_AGGREGATION).field(PRICE_FIELD))
                .subAggregation(AggregationBuilders.max(PRICE_MAX_AGGREGATION).field(PRICE_FIELD));
    }

    /**
     * Returns the aggregations of a search response.
     *
     * @param searchHits response of the search request
     *
     * @return the aggregations, or null when the response carries none
     */
    private static Aggregations aggregationsOf(SearchHits<ProductSearchDocument> searchHits) {
        AggregationsContainer<?> container = searchHits.getAggregations();

        return container != null && container.aggregations() instanceof Aggregations result ? result : null;
    }

    /**
     * Translates one aggregation into its facet buckets.
     *
     * @param aggregation aggregation of the search response, may be null
     *
     * @return the buckets of the aggregation, or an empty list when it is missing or has no buckets
     */
    private static List<FacetBucket> bucketsOf(Aggregation aggregation) {
        if (aggregation instanceof MultiBucketsAggregation multiBuckets) {
            return multiBuckets.getBuckets().stream()
                    .map(bucket -> new FacetBucket(bucket.getKeyAsString(), bucket.getDocCount()))
                    .toList();
        }

        return List.of();
    }

    /**
     * Translates a numeric metric aggregation into a money amount.
     *
     * <p>The engine answers with a double even for the scaled money field, so the value is rounded to the scale of the
     * index and a missing measurement, reported as a non-finite value, becomes null.
     *
     * @param aggregation metric aggregation of the response, may be null
     *
     * @return the amount rounded to {@link #MONEY_SCALE} decimals, or null when the aggregation has no value
     */
    private static BigDecimal amountOf(Aggregation aggregation) {
        if (aggregation instanceof NumericMetricsAggregation.SingleValue metric && Double.isFinite(metric.value())) {
            return BigDecimal.valueOf(metric.value()).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
        }

        return null;
    }

    /**
     * Translates one relational property into its index field.
     *
     * @param property property received through the sort parameter
     *
     * @return the index field used to order by the given property
     */
    private static String translate(String property) {
        return NAME_FIELD.equals(property) ? property + KEYWORD_SUFFIX : property;
    }
}
