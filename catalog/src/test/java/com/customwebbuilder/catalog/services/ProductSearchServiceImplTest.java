package com.customwebbuilder.catalog.services;

import com.customwebbuilder.catalog.BaseTest;
import com.customwebbuilder.catalog.models.Product;
import com.customwebbuilder.catalog.models.enums.FacetName;
import com.customwebbuilder.catalog.models.search.FacetBucket;
import com.customwebbuilder.catalog.models.search.PriceBounds;
import com.customwebbuilder.catalog.models.search.ProductSearchDocument;
import com.customwebbuilder.catalog.models.search.ProductSearchResult;
import com.customwebbuilder.catalog.services.impl.ProductSearchServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.opensearch.data.client.orhlc.NativeSearchQuery;
import org.opensearch.index.query.*;
import org.opensearch.search.aggregations.Aggregation;
import org.opensearch.search.aggregations.AggregationBuilder;
import org.opensearch.search.aggregations.Aggregations;
import org.opensearch.search.aggregations.bucket.global.Global;
import org.opensearch.search.aggregations.bucket.global.GlobalAggregationBuilder;
import org.opensearch.search.aggregations.bucket.terms.Terms;
import org.opensearch.search.aggregations.metrics.Max;
import org.opensearch.search.aggregations.metrics.Min;
import org.opensearch.search.sort.FieldSortBuilder;
import org.opensearch.search.sort.SortOrder;
import org.springframework.data.domain.*;
import org.springframework.data.elasticsearch.core.AggregationsContainer;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.Query;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ProductSearchServiceImpl}, covering the query built for each filter combination, the facet
 * aggregations, the page returned to the controller and the rebuild flow of the index.
 */
@ExtendWith(MockitoExtension.class)
class ProductSearchServiceImplTest extends BaseTest {

    private static final String CATEGORY_FIELD = "categories.name";
    private static final String ACTIVE_FIELD = "active";
    private static final String PRICE_BOUNDS_AGGREGATION = "priceBounds";
    private static final String PRICE_MIN_AGGREGATION = "min";
    private static final String PRICE_MAX_AGGREGATION = "max";

    @Mock
    private ElasticsearchOperations elasticsearchOperations;

    @Mock
    private ProductsService productsService;

    @Mock
    private ProductSearchIndexer productSearchIndexer;

    @InjectMocks
    private ProductSearchServiceImpl productSearchService;

    @Test
    void returnsTheRequestedPageWithAMatchAllQueryWhenNoFilterIsGiven() {
        ProductSearchDocument document = documentWithId(7L);
        SearchHits<ProductSearchDocument> searchHits = searchHitsWith(document);
        when(elasticsearchOperations.search(any(Query.class), eq(ProductSearchDocument.class)))
                .thenReturn(searchHits);

        ProductSearchResult result = productSearchService.search(
                "   ",
                null,
                null,
                null,
                null,
                PageRequest.of(0, 20, Sort.by("price"))
        );

        assertThat(result.products().getContent()).containsExactly(document);
        assertThat(result.products().getTotalElements()).isEqualTo(1);

        NativeSearchQuery query = captureNativeQuery();
        assertThat(query.getQuery()).isInstanceOf(MatchAllQueryBuilder.class);
        assertThat(query.getPageable().getPageNumber()).isZero();
        assertThat(query.getPageable().getPageSize()).isEqualTo(20);
        assertThat(query.getOpenSearchSorts())
                .extracting(sort -> ((FieldSortBuilder) sort).getFieldName())
                .containsExactly("price");
    }

    private static ProductSearchDocument documentWithId(Long id) {
        ProductSearchDocument document = new ProductSearchDocument();
        document.setId(id);

        return document;
    }

    @SuppressWarnings("unchecked")
    private static SearchHits<ProductSearchDocument> searchHitsWith(ProductSearchDocument document) {
        SearchHit<ProductSearchDocument> searchHit = mock(SearchHit.class);
        when(searchHit.getContent()).thenReturn(document);

        SearchHits<ProductSearchDocument> searchHits = mock(SearchHits.class);
        when(searchHits.getSearchHits()).thenReturn(List.of(searchHit));
        when(searchHits.getTotalHits()).thenReturn(1L);

        return searchHits;
    }

    private NativeSearchQuery captureNativeQuery() {
        Query query = captureQuery();
        assertThat(query).isInstanceOf(NativeSearchQuery.class);

        return (NativeSearchQuery) query;
    }

    private Query captureQuery() {
        ArgumentCaptor<Query> captor = ArgumentCaptor.forClass(Query.class);
        verify(elasticsearchOperations).search(captor.capture(), eq(ProductSearchDocument.class));

        return captor.getValue();
    }

    @Test
    void groupsTheTextMatchesOfNameDescriptionAndBrandWithAMultiMatchClause() {
        SearchHits<ProductSearchDocument> searchHits = emptySearchHits();
        when(elasticsearchOperations.search(any(Query.class), eq(ProductSearchDocument.class)))
                .thenReturn(searchHits);

        productSearchService.search("keyboard", null, null, null, null, PageRequest.of(0, 20));

        BoolQueryBuilder query = (BoolQueryBuilder) captureNativeQuery().getQuery();
        assertThat(query.must()).singleElement().satisfies(clause -> {
            assertThat(clause).isInstanceOf(MultiMatchQueryBuilder.class);

            MultiMatchQueryBuilder multiMatch = (MultiMatchQueryBuilder) clause;
            assertThat(multiMatch.fields()).containsOnlyKeys("name", "description", "brand");
            assertThat(multiMatch.value()).isEqualTo("keyboard");
        });
    }

    @SuppressWarnings("unchecked")
    private static SearchHits<ProductSearchDocument> emptySearchHits() {
        SearchHits<ProductSearchDocument> searchHits = mock(SearchHits.class);
        when(searchHits.getSearchHits()).thenReturn(List.of());
        when(searchHits.getTotalHits()).thenReturn(0L);

        return searchHits;
    }

    @Test
    void filtersByCategoryAndActiveInsideTheQuerySoTheAggregationsSeeThem() {
        SearchHits<ProductSearchDocument> searchHits = emptySearchHits();
        when(elasticsearchOperations.search(any(Query.class), eq(ProductSearchDocument.class)))
                .thenReturn(searchHits);

        productSearchService.search(null, "Peripherals", true, null, null, PageRequest.of(0, 20));

        NativeSearchQuery nativeQuery = captureNativeQuery();
        BoolQueryBuilder query = (BoolQueryBuilder) nativeQuery.getQuery();

        assertThat(query.filter())
                .extracting(clause -> ((TermQueryBuilder) clause).fieldName())
                .containsExactlyInAnyOrder(CATEGORY_FIELD, ACTIVE_FIELD);
        assertThat(termQueryOf(query, CATEGORY_FIELD).value()).isEqualTo("Peripherals");
        assertThat(termQueryOf(query, ACTIVE_FIELD).value()).isEqualTo(true);
        assertThat(nativeQuery.getFilter()).isNull();
    }

    private static TermQueryBuilder termQueryOf(BoolQueryBuilder query, String field) {
        return query.filter().stream()
                .map(TermQueryBuilder.class::cast)
                .filter(term -> field.equals(term.fieldName()))
                .findFirst()
                .orElseThrow();
    }

    @Test
    void filtersByTheRequestedPriceRangeInsideTheQuerySoTheAggregationsSeeThem() {
        SearchHits<ProductSearchDocument> searchHits = emptySearchHits();
        when(elasticsearchOperations.search(any(Query.class), eq(ProductSearchDocument.class)))
                .thenReturn(searchHits);

        productSearchService.search(
                null,
                null,
                null,
                new BigDecimal("10.00"),
                new BigDecimal("100.00"),
                PageRequest.of(0, 20)
        );

        RangeQueryBuilder range = priceRangeOf((BoolQueryBuilder) captureNativeQuery().getQuery());
        assertThat(range.fieldName()).isEqualTo("price");
        assertThat(range.from()).isEqualTo(new BigDecimal("10.00"));
        assertThat(range.to()).isEqualTo(new BigDecimal("100.00"));
    }

    private static RangeQueryBuilder priceRangeOf(BoolQueryBuilder query) {
        return query.filter().stream()
                .filter(RangeQueryBuilder.class::isInstance)
                .map(RangeQueryBuilder.class::cast)
                .findFirst()
                .orElseThrow();
    }

    @Test
    void appliesOnlyTheRequestedPriceBound() {
        SearchHits<ProductSearchDocument> searchHits = emptySearchHits();
        when(elasticsearchOperations.search(any(Query.class), eq(ProductSearchDocument.class)))
                .thenReturn(searchHits);

        productSearchService.search(null, null, null, null, new BigDecimal("100.00"), PageRequest.of(0, 20));

        RangeQueryBuilder range = priceRangeOf((BoolQueryBuilder) captureNativeQuery().getQuery());
        assertThat(range.from()).isNull();
        assertThat(range.to()).isEqualTo(new BigDecimal("100.00"));
    }

    @Test
    void appliesOnlyTheRequestedLowerPriceBound() {
        SearchHits<ProductSearchDocument> searchHits = emptySearchHits();
        when(elasticsearchOperations.search(any(Query.class), eq(ProductSearchDocument.class)))
                .thenReturn(searchHits);

        productSearchService.search(null, null, null, new BigDecimal("10.00"), null, PageRequest.of(0, 20));

        RangeQueryBuilder range = priceRangeOf((BoolQueryBuilder) captureNativeQuery().getQuery());
        assertThat(range.from()).isEqualTo(new BigDecimal("10.00"));
        assertThat(range.to()).isNull();
    }

    @Test
    void ordersByNameThroughTheKeywordSubField() {
        SearchHits<ProductSearchDocument> searchHits = emptySearchHits();
        when(elasticsearchOperations.search(any(Query.class), eq(ProductSearchDocument.class)))
                .thenReturn(searchHits);

        productSearchService.search(
                null,
                null,
                null,
                null,
                null,
                PageRequest.of(2, 5, Sort.by(Sort.Direction.DESC, "name").and(Sort.by("price")))
        );

        NativeSearchQuery query = captureNativeQuery();
        assertThat(query.getPageable().getPageNumber()).isEqualTo(2);
        assertThat(query.getPageable().getPageSize()).isEqualTo(5);
        assertThat(query.getOpenSearchSorts())
                .extracting(sort -> ((FieldSortBuilder) sort).getFieldName())
                .containsExactly("name.keyword", "price");
        assertThat(query.getOpenSearchSorts().get(0).order()).isEqualTo(SortOrder.DESC);
        assertThat(query.getOpenSearchSorts().get(1).order()).isEqualTo(SortOrder.ASC);
    }

    @Test
    void requestsOneAggregationPerFacetPlusThePriceBounds() {
        SearchHits<ProductSearchDocument> searchHits = emptySearchHits();
        when(elasticsearchOperations.search(any(Query.class), eq(ProductSearchDocument.class)))
                .thenReturn(searchHits);

        productSearchService.search("keyboard", "Peripherals", true, null, null, PageRequest.of(0, 20));

        assertThat(captureNativeQuery().getAggregations())
                .extracting(AggregationBuilder::getName)
                .containsExactlyInAnyOrder(
                        FacetName.CATEGORY.getKey(),
                        FacetName.BRAND.getKey(),
                        FacetName.ACTIVE.getKey(),
                        FacetName.PRICE_RANGE.getKey(),
                        PRICE_BOUNDS_AGGREGATION
                );
    }

    @Test
    void requestsThePriceBoundsAsAGlobalAggregation() {
        SearchHits<ProductSearchDocument> searchHits = emptySearchHits();
        when(elasticsearchOperations.search(any(Query.class), eq(ProductSearchDocument.class)))
                .thenReturn(searchHits);

        productSearchService.search(null, null, null, null, null, PageRequest.of(0, 20));

        AggregationBuilder bounds = captureNativeQuery().getAggregations().stream()
                .filter(aggregation -> PRICE_BOUNDS_AGGREGATION.equals(aggregation.getName()))
                .findFirst()
                .orElseThrow();

        assertThat(bounds).isInstanceOf(GlobalAggregationBuilder.class);
        assertThat(bounds.getSubAggregations())
                .extracting(AggregationBuilder::getName)
                .containsExactlyInAnyOrder(PRICE_MIN_AGGREGATION, PRICE_MAX_AGGREGATION);
    }

    @Test
    void returnsTheFacetBucketsOfTheSearchResponse() {
        ProductSearchDocument document = documentWithId(7L);
        SearchHits<ProductSearchDocument> searchHits = searchHitsWith(document);
        Terms categories = termsWith("Peripherals", 3L, "Accessories", 1L);
        doReturn(containerWith(FacetName.CATEGORY.getKey(), categories))
                .when(searchHits).getAggregations();
        when(elasticsearchOperations.search(any(Query.class), eq(ProductSearchDocument.class)))
                .thenReturn(searchHits);

        ProductSearchResult result = productSearchService.search(null, null, null, null, null, PageRequest.of(0, 20));

        assertThat(result.facets().get(FacetName.CATEGORY))
                .containsExactly(
                        new FacetBucket("Peripherals", 3L),
                        new FacetBucket("Accessories", 1L)
                );
        assertThat(result.facets().get(FacetName.BRAND)).isEmpty();
    }

    private static Terms termsWith(Object... bucketPairs) {
        Terms terms = mock(Terms.class);
        List<Terms.Bucket> buckets = new ArrayList<>();

        for (int index = 0; index < bucketPairs.length; index += 2) {
            Terms.Bucket bucket = mock(Terms.Bucket.class);
            when(bucket.getKeyAsString()).thenReturn((String) bucketPairs[index]);
            when(bucket.getDocCount()).thenReturn((Long) bucketPairs[index + 1]);
            buckets.add(bucket);
        }

        doReturn(buckets).when(terms).getBuckets();

        return terms;
    }

    @SuppressWarnings("unchecked")
    private static AggregationsContainer<?> containerWith(String name, Aggregation aggregation) {
        Aggregations aggregations = mock(Aggregations.class);
        lenient().when(aggregations.get(name)).thenReturn(aggregation);

        AggregationsContainer<Aggregations> container = mock(AggregationsContainer.class);
        when(container.aggregations()).thenReturn(aggregations);

        return container;
    }

    @Test
    void returnsThePriceBoundsOfTheGlobalAggregation() {
        SearchHits<ProductSearchDocument> searchHits = emptySearchHits();
        Global global = mock(Global.class);
        Aggregations inner = mock(Aggregations.class);
        Min min = mock(Min.class);
        Max max = mock(Max.class);
        when(min.value()).thenReturn(10.0);
        when(max.value()).thenReturn(1199.0);
        doReturn(min).when(inner).get(PRICE_MIN_AGGREGATION);
        doReturn(max).when(inner).get(PRICE_MAX_AGGREGATION);
        when(global.getAggregations()).thenReturn(inner);
        doReturn(containerWith(PRICE_BOUNDS_AGGREGATION, global)).when(searchHits).getAggregations();
        when(elasticsearchOperations.search(any(Query.class), eq(ProductSearchDocument.class)))
                .thenReturn(searchHits);

        ProductSearchResult result = productSearchService.search(null, null, null, null, null, PageRequest.of(0, 20));

        assertThat(result.priceBounds())
                .isEqualTo(new PriceBounds(new BigDecimal("10.00"), new BigDecimal("1199.00")));
    }

    @Test
    void returnsNoPriceBoundsWhenTheIndexHasNoPrices() {
        SearchHits<ProductSearchDocument> searchHits = emptySearchHits();
        Global global = mock(Global.class);
        Aggregations inner = mock(Aggregations.class);
        Min min = mock(Min.class);
        Max max = mock(Max.class);
        when(min.value()).thenReturn(Double.POSITIVE_INFINITY);
        when(max.value()).thenReturn(Double.NEGATIVE_INFINITY);
        doReturn(min).when(inner).get(PRICE_MIN_AGGREGATION);
        doReturn(max).when(inner).get(PRICE_MAX_AGGREGATION);
        when(global.getAggregations()).thenReturn(inner);
        doReturn(containerWith(PRICE_BOUNDS_AGGREGATION, global)).when(searchHits).getAggregations();
        when(elasticsearchOperations.search(any(Query.class), eq(ProductSearchDocument.class)))
                .thenReturn(searchHits);

        ProductSearchResult result = productSearchService.search(null, null, null, null, null, PageRequest.of(0, 20));

        assertThat(result.priceBounds()).isEqualTo(PriceBounds.empty());
    }

    @Test
    void returnsAnEmptyListForEveryFacetWhenTheResponseHasNoAggregations() {
        SearchHits<ProductSearchDocument> searchHits = emptySearchHits();
        when(elasticsearchOperations.search(any(Query.class), eq(ProductSearchDocument.class)))
                .thenReturn(searchHits);

        ProductSearchResult result = productSearchService.search(null, null, null, null, null, PageRequest.of(0, 20));

        assertThat(result.facets()).containsKeys(FacetName.values());
        assertThat(result.facets()).allSatisfy((facet, buckets) -> assertThat(buckets).isEmpty());
        assertThat(result.priceBounds()).isEqualTo(PriceBounds.empty());
    }

    @Test
    void ignoresASearchResponseWhoseAggregationsAreNotAnAggregationContainer() {
        SearchHits<ProductSearchDocument> searchHits = emptySearchHits();
        doReturn(containerWithUnexpectedContent()).when(searchHits).getAggregations();
        when(elasticsearchOperations.search(any(Query.class), eq(ProductSearchDocument.class)))
                .thenReturn(searchHits);

        ProductSearchResult result = productSearchService.search(null, null, null, null, null, PageRequest.of(0, 20));

        assertThat(result.facets()).allSatisfy((facet, buckets) -> assertThat(buckets).isEmpty());
        assertThat(result.priceBounds()).isEqualTo(PriceBounds.empty());
    }

    @SuppressWarnings("unchecked")
    private static AggregationsContainer<?> containerWithUnexpectedContent() {
        AggregationsContainer<Object> container = mock(AggregationsContainer.class);
        doReturn("not-an-aggregation-container").when(container).aggregations();

        return container;
    }

    @Test
    void ignoresPriceBoundAggregationsThatAreNotNumericMetrics() {
        SearchHits<ProductSearchDocument> searchHits = emptySearchHits();
        Global global = mock(Global.class);
        Aggregations inner = mock(Aggregations.class);
        Terms unexpected = mock(Terms.class);
        doReturn(unexpected).when(inner).get(PRICE_MIN_AGGREGATION);
        doReturn(unexpected).when(inner).get(PRICE_MAX_AGGREGATION);
        when(global.getAggregations()).thenReturn(inner);
        doReturn(containerWith(PRICE_BOUNDS_AGGREGATION, global)).when(searchHits).getAggregations();
        when(elasticsearchOperations.search(any(Query.class), eq(ProductSearchDocument.class)))
                .thenReturn(searchHits);

        ProductSearchResult result = productSearchService.search(null, null, null, null, null, PageRequest.of(0, 20));

        assertThat(result.priceBounds()).isEqualTo(PriceBounds.empty());
    }

    @Test
    void returnsTheIndexedProduct() {
        ProductSearchDocument document = documentWithId(3L);
        when(elasticsearchOperations.get("3", ProductSearchDocument.class)).thenReturn(document);

        Optional<ProductSearchDocument> result = productSearchService.findById(3L);

        assertThat(result).contains(document);
    }

    @Test
    void returnsEmptyWhenTheProductIsNotIndexed() {
        when(elasticsearchOperations.get("4", ProductSearchDocument.class)).thenReturn(null);

        assertThat(productSearchService.findById(4L)).isEmpty();
    }

    @Test
    void returnsEmptyWithoutQueryingTheIndexWhenTheIdentifierIsNull() {
        assertThat(productSearchService.findById(null)).isEmpty();

        verifyNoInteractions(elasticsearchOperations);
    }

    @Test
    void rebuildsTheIndexPageByPageAndReturnsTheNumberOfIndexedProducts() {
        Product keyboard = productWithId(1L);
        Product mouse = productWithId(2L);
        Product webcam = productWithId(3L);
        Page<Product> firstPage = new PageImpl<>(List.of(keyboard, mouse), PageRequest.of(0, 2), 3);
        Page<Product> secondPage = new PageImpl<>(List.of(webcam), PageRequest.of(1, 2), 3);
        when(productsService.findAll(any(Pageable.class))).thenReturn(firstPage, secondPage);

        long indexed = productSearchService.reindex();

        assertThat(indexed).isEqualTo(3);
        verify(productSearchIndexer).recreate();
        verify(productSearchIndexer).indexAll(firstPage.getContent());
        verify(productSearchIndexer).indexAll(secondPage.getContent());

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(productsService, times(2)).findAll(pageableCaptor.capture());
        assertThat(pageableCaptor.getAllValues())
                .extracting(Pageable::getPageNumber)
                .containsExactly(0, 1);
        assertThat(pageableCaptor.getAllValues().getFirst().getSort())
                .isEqualTo(Sort.by(Sort.Direction.ASC, "id"));
    }

    private static Product productWithId(Long id) {
        Product product = new Product();
        product.setId(id);

        return product;
    }

    @Test
    void rebuildsTheIndexWithAnEmptyBatchWhenTheCatalogHasNoProducts() {
        when(productsService.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 2), 0));

        long indexed = productSearchService.reindex();

        assertThat(indexed).isZero();
        verify(productSearchIndexer).recreate();
        verify(productSearchIndexer).indexAll(List.of());
    }

    @Test
    void skipsTheReindexWhenTheIndexCannotBeEnsured() {
        when(productSearchIndexer.ensureIndex()).thenReturn(false);

        long indexed = productSearchService.reindexIfEmpty();

        assertThat(indexed).isZero();
        verify(productSearchIndexer, never()).count();
        verify(productSearchIndexer, never()).recreate();
        verifyNoInteractions(productsService);
    }

    @Test
    void skipsTheReindexWhenTheIndexAlreadyHasDocuments() {
        when(productSearchIndexer.ensureIndex()).thenReturn(true);
        when(productSearchIndexer.count()).thenReturn(3L);

        long indexed = productSearchService.reindexIfEmpty();

        assertThat(indexed).isZero();
        verify(productSearchIndexer, never()).recreate();
        verifyNoInteractions(productsService);
    }

    @Test
    void rebuildsTheIndexWhenItIsEmpty() {
        Product product = productWithId(5L);
        Page<Product> page = new PageImpl<>(List.of(product), PageRequest.of(0, 2), 1);
        when(productSearchIndexer.ensureIndex()).thenReturn(true);
        when(productSearchIndexer.count()).thenReturn(0L);
        when(productsService.findAll(any(Pageable.class))).thenReturn(page);

        long indexed = productSearchService.reindexIfEmpty();

        assertThat(indexed).isEqualTo(1);
        verify(productSearchIndexer).indexAll(page.getContent());
    }
}
