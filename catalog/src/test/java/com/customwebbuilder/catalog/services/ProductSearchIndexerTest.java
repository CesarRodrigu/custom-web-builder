package com.customwebbuilder.catalog.services;

import com.customwebbuilder.catalog.BaseTest;
import com.customwebbuilder.catalog.mappers.ProductSearchMapper;
import com.customwebbuilder.catalog.models.Product;
import com.customwebbuilder.catalog.models.search.ProductSearchDocument;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.IndexOperations;
import org.springframework.data.elasticsearch.core.RefreshPolicy;
import org.springframework.data.elasticsearch.core.query.BulkOptions;
import org.springframework.data.elasticsearch.core.query.IndexQuery;
import org.springframework.data.elasticsearch.core.query.Query;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ProductSearchIndexer}, covering the index creation, the best-effort incremental writes and the
 * full rebuild of the search index.
 */
@ExtendWith(MockitoExtension.class)
class ProductSearchIndexerTest extends BaseTest {

    @Mock
    private ElasticsearchOperations elasticsearchOperations;

    @Mock
    private ProductSearchMapper productSearchMapper;

    @Mock
    private IndexOperations indexOperations;

    @InjectMocks
    private ProductSearchIndexer productSearchIndexer;

    @Test
    void createsTheIndexWithTheDocumentMappingWhenItDoesNotExist() {
        when(elasticsearchOperations.indexOps(ProductSearchDocument.class)).thenReturn(indexOperations);
        when(indexOperations.exists()).thenReturn(false);

        assertThat(productSearchIndexer.ensureIndex()).isTrue();

        verify(indexOperations).createWithMapping();
    }

    @Test
    void keepsTheExistingIndexUntouched() {
        when(elasticsearchOperations.indexOps(ProductSearchDocument.class)).thenReturn(indexOperations);
        when(indexOperations.exists()).thenReturn(true);

        assertThat(productSearchIndexer.ensureIndex()).isTrue();

        verify(indexOperations, never()).createWithMapping();
    }

    @Test
    void reportsThatTheIndexCouldNotBeEnsuredWhenOpenSearchIsUnavailable() {
        when(elasticsearchOperations.indexOps(ProductSearchDocument.class))
                .thenThrow(new RuntimeException("OpenSearch is down"));

        assertThat(productSearchIndexer.ensureIndex()).isFalse();
    }

    @Test
    void indexesTheDocumentWithAnImmediateRefresh() {
        ProductSearchDocument document = documentWithId(1L);
        when(elasticsearchOperations.withRefreshPolicy(RefreshPolicy.IMMEDIATE))
                .thenReturn(elasticsearchOperations);

        productSearchIndexer.index(document);

        verify(elasticsearchOperations).save(document);
    }

    private static ProductSearchDocument documentWithId(Long id) {
        ProductSearchDocument document = new ProductSearchDocument();
        document.setId(id);

        return document;
    }

    @Test
    void skipsTheIndexingOfMissingDocuments() {
        assertThatCode(() -> productSearchIndexer.index(null)).doesNotThrowAnyException();
        assertThatCode(() -> productSearchIndexer.index(new ProductSearchDocument()))
                .doesNotThrowAnyException();

        verifyNoInteractions(elasticsearchOperations);
    }

    @Test
    void swallowsTheFailuresOfAnIncrementalIndexing() {
        ProductSearchDocument document = documentWithId(2L);
        when(elasticsearchOperations.withRefreshPolicy(RefreshPolicy.IMMEDIATE))
                .thenReturn(elasticsearchOperations);
        when(elasticsearchOperations.save(document)).thenThrow(new RuntimeException("OpenSearch is down"));

        assertThatCode(() -> productSearchIndexer.index(document)).doesNotThrowAnyException();
    }

    @Test
    void deletesTheDocumentWithAnImmediateRefresh() {
        when(elasticsearchOperations.withRefreshPolicy(RefreshPolicy.IMMEDIATE))
                .thenReturn(elasticsearchOperations);

        productSearchIndexer.delete(3L);

        verify(elasticsearchOperations).delete("3", ProductSearchDocument.class);
    }

    @Test
    void skipsTheDeletionWhenTheIdentifierIsNull() {
        assertThatCode(() -> productSearchIndexer.delete(null)).doesNotThrowAnyException();

        verifyNoInteractions(elasticsearchOperations);
    }

    @Test
    void swallowsTheFailuresOfAnIncrementalDeletion() {
        when(elasticsearchOperations.withRefreshPolicy(RefreshPolicy.IMMEDIATE))
                .thenReturn(elasticsearchOperations);
        when(elasticsearchOperations.delete("4", ProductSearchDocument.class))
                .thenThrow(new RuntimeException("OpenSearch is down"));

        assertThatCode(() -> productSearchIndexer.delete(4L)).doesNotThrowAnyException();
    }

    @Test
    void countsEveryIndexedDocument() {
        when(elasticsearchOperations.count(any(Query.class), eq(ProductSearchDocument.class)))
                .thenReturn(5L);

        assertThat(productSearchIndexer.count()).isEqualTo(5);
    }

    @Test
    void recreatesTheIndexDeletingThePreviousDocuments() {
        when(elasticsearchOperations.indexOps(ProductSearchDocument.class)).thenReturn(indexOperations);
        when(indexOperations.exists()).thenReturn(true);

        productSearchIndexer.recreate();

        verify(indexOperations).delete();
        verify(indexOperations).createWithMapping();
    }

    @Test
    void recreatesTheIndexWithoutDeletingItWhenItDoesNotExist() {
        when(elasticsearchOperations.indexOps(ProductSearchDocument.class)).thenReturn(indexOperations);
        when(indexOperations.exists()).thenReturn(false);

        productSearchIndexer.recreate();

        verify(indexOperations, never()).delete();
        verify(indexOperations).createWithMapping();
    }

    @Test
    void writesTheBatchOfProductsInOneBulkRequest() {
        Product keyboard = productWithId(1L);
        Product mouse = productWithId(2L);
        ProductSearchDocument keyboardDocument = documentWithId(1L);
        ProductSearchDocument mouseDocument = documentWithId(2L);

        when(productSearchMapper.toDocument(keyboard)).thenReturn(keyboardDocument);
        when(productSearchMapper.toDocument(mouse)).thenReturn(mouseDocument);

        productSearchIndexer.indexAll(List.of(keyboard, mouse));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<IndexQuery>> queriesCaptor = ArgumentCaptor.forClass(List.class);
        verify(elasticsearchOperations)
                .bulkIndex(queriesCaptor.capture(), any(BulkOptions.class), eq(ProductSearchDocument.class));

        assertThat(queriesCaptor.getValue())
                .extracting(IndexQuery::getId)
                .containsExactly("1", "2");
        assertThat(queriesCaptor.getValue())
                .extracting(IndexQuery::getObject)
                .containsExactly(keyboardDocument, mouseDocument);
    }

    private static Product productWithId(Long id) {
        Product product = new Product();
        product.setId(id);

        return product;
    }

    @Test
    void skipsTheBulkRequestWhenTheBatchIsEmpty() {
        productSearchIndexer.indexAll(List.of());

        verifyNoInteractions(elasticsearchOperations);
    }

    @Test
    void convertsTheProductThroughTheMapper() {
        Product product = productWithId(8L);
        ProductSearchDocument document = documentWithId(8L);
        when(productSearchMapper.toDocument(product)).thenReturn(document);

        assertThat(productSearchIndexer.toDocument(product)).isSameAs(document);
    }
}
