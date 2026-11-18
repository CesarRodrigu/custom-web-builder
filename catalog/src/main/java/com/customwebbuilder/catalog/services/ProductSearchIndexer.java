package com.customwebbuilder.catalog.services;

import com.customwebbuilder.catalog.logging.LoggingKeys;
import com.customwebbuilder.catalog.mappers.ProductSearchMapper;
import com.customwebbuilder.catalog.models.Product;
import com.customwebbuilder.catalog.models.search.ProductSearchDocument;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.IndexOperations;
import org.springframework.data.elasticsearch.core.RefreshPolicy;
import org.springframework.data.elasticsearch.core.query.BulkOptions;
import org.springframework.data.elasticsearch.core.query.IndexQuery;
import org.springframework.data.elasticsearch.core.query.IndexQueryBuilder;
import org.springframework.data.elasticsearch.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;

/**
 * Writes the product documents into OpenSearch.
 *
 * <p>The index is created from the annotations of {@link ProductSearchDocument}, so its mapping does not depend on
 * dynamic detection. Incremental writes are best effort: a search backend that is temporarily unavailable must never
 * break a database write, therefore failures are logged and swallowed. A full rebuild, however, reports its errors
 * because the caller needs to know that the index could not be rebuilt.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProductSearchIndexer {

    private final ElasticsearchOperations elasticsearchOperations;
    private final ProductSearchMapper productSearchMapper;

    /**
     * Creates the product index when it does not exist yet.
     *
     * @return true when the index exists or was created, false when OpenSearch could not be reached
     */
    public boolean ensureIndex() {
        try {
            IndexOperations indexOperations = elasticsearchOperations.indexOps(ProductSearchDocument.class);

            if (!indexOperations.exists()) {
                indexOperations.createWithMapping();
                log.atInfo()
                        .addKeyValue(LoggingKeys.EVENT, "search_index_created")
                        .addKeyValue("indexName", ProductSearchDocument.INDEX_NAME)
                        .log("Created the OpenSearch index with the product mapping");
            } else {
                log.atDebug()
                        .addKeyValue(LoggingKeys.EVENT, "search_index_present")
                        .addKeyValue("indexName", ProductSearchDocument.INDEX_NAME)
                        .log("The OpenSearch product index already exists");
            }

            return true;
        } catch (RuntimeException ex) {
            log.atWarn()
                    .addKeyValue(LoggingKeys.EVENT, "search_index_ensure_failed")
                    .addKeyValue("indexName", ProductSearchDocument.INDEX_NAME)
                    .setCause(ex)
                    .log("Could not ensure the OpenSearch product index");

            return false;
        }
    }

    /**
     * Writes one product document, refreshing the index so the change is immediately searchable.
     *
     * <p>Failures are logged and ignored because the relational write has already been committed.
     *
     * @param document product document to index, ignored when null or without identifier
     */
    public void index(ProductSearchDocument document) {
        if (document == null || document.getId() == null) {
            log.atWarn()
                    .addKeyValue(LoggingKeys.EVENT, "product_document_indexing_skipped")
                    .addKeyValue("reason", "missing_id")
                    .log("Skipping the indexing of a product document without identifier");

            return;
        }

        try {
            elasticsearchOperations
                    .withRefreshPolicy(RefreshPolicy.IMMEDIATE)
                    .save(document);

            log.atDebug()
                    .addKeyValue(LoggingKeys.EVENT, "product_document_indexed")
                    .addKeyValue("indexName", ProductSearchDocument.INDEX_NAME)
                    .addKeyValue("productId", document.getId())
                    .log("Indexed the product document");
        } catch (RuntimeException ex) {
            log.atWarn()
                    .addKeyValue(LoggingKeys.EVENT, "product_document_indexing_failed")
                    .addKeyValue("indexName", ProductSearchDocument.INDEX_NAME)
                    .addKeyValue("productId", document.getId())
                    .setCause(ex)
                    .log("Could not index the product in OpenSearch");
        }
    }

    /**
     * Removes one product document from the index, refreshing it so the deletion is immediately visible.
     *
     * <p>Failures are logged and ignored because the relational write has already been committed.
     *
     * @param id identifier of the product to remove from the index
     */
    public void delete(Long id) {
        if (id == null) {
            log.atWarn()
                    .addKeyValue(LoggingKeys.EVENT, "product_document_deletion_skipped")
                    .addKeyValue("reason", "missing_id")
                    .log("Skipping the deletion of a product document without identifier");

            return;
        }

        try {
            elasticsearchOperations
                    .withRefreshPolicy(RefreshPolicy.IMMEDIATE)
                    .delete(String.valueOf(id), ProductSearchDocument.class);

            log.atDebug()
                    .addKeyValue(LoggingKeys.EVENT, "product_document_deleted")
                    .addKeyValue("indexName", ProductSearchDocument.INDEX_NAME)
                    .addKeyValue("productId", id)
                    .log("Deleted the product document");
        } catch (RuntimeException ex) {
            log.atWarn()
                    .addKeyValue(LoggingKeys.EVENT, "product_document_deletion_failed")
                    .addKeyValue("indexName", ProductSearchDocument.INDEX_NAME)
                    .addKeyValue("productId", id)
                    .setCause(ex)
                    .log("Could not remove the product from OpenSearch");
        }
    }

    /**
     * Counts the product documents currently indexed.
     *
     * @return the number of documents in the product index
     */
    public long count() {
        return elasticsearchOperations.count(Query.findAll(), ProductSearchDocument.class);
    }

    /**
     * Deletes the product index when it exists and creates it again with the document mapping, leaving it empty so the
     * caller can write it in batches.
     *
     * <p>Unlike the incremental writes, this operation propagates failures because the caller must know that the index
     * could not be rebuilt.
     */
    public void recreate() {
        IndexOperations indexOperations = elasticsearchOperations.indexOps(ProductSearchDocument.class);

        if (indexOperations.exists()) {
            indexOperations.delete();
        }

        indexOperations.createWithMapping();

        log.atInfo()
                .addKeyValue(LoggingKeys.EVENT, "search_index_recreated")
                .addKeyValue("indexName", ProductSearchDocument.INDEX_NAME)
                .log("Recreated the OpenSearch product index");
    }

    /**
     * Writes one batch of products into the index, refreshing it so the documents are immediately searchable.
     *
     * <p>It belongs to the rebuild of the index, so failures are propagated to the caller.
     *
     * @param products products of the batch, may be empty
     */
    public void indexAll(Collection<Product> products) {
        if (products.isEmpty()) {
            return;
        }

        List<IndexQuery> queries = products.stream()
                .map(this::toIndexQuery)
                .toList();

        BulkOptions options = BulkOptions.builder()
                .withRefreshPolicy(RefreshPolicy.IMMEDIATE)
                .build();
        elasticsearchOperations.bulkIndex(queries, options, ProductSearchDocument.class);

        log.atDebug()
                .addKeyValue(LoggingKeys.EVENT, "product_documents_indexed")
                .addKeyValue("indexName", ProductSearchDocument.INDEX_NAME)
                .addKeyValue("documentCount", queries.size())
                .log("Indexed a batch of product documents");
    }

    /**
     * Builds the index operation that writes one product document.
     *
     * @param product product to index
     *
     * @return the index operation ready to be sent in a bulk request
     */
    private IndexQuery toIndexQuery(Product product) {
        ProductSearchDocument document = productSearchMapper.toDocument(product);

        return new IndexQueryBuilder()
                .withId(String.valueOf(product.getId()))
                .withObject(document)
                .build();
    }

    /**
     * Converts a product into the document written by the mapper.
     *
     * @param product product to convert
     *
     * @return the search document of the product
     */
    public ProductSearchDocument toDocument(Product product) {
        return productSearchMapper.toDocument(product);
    }
}
