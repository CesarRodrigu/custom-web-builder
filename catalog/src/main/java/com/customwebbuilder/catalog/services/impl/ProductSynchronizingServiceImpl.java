package com.customwebbuilder.catalog.services.impl;

import com.customwebbuilder.catalog.logging.LoggingKeys;
import com.customwebbuilder.catalog.models.Product;
import com.customwebbuilder.catalog.services.ProductSearchIndexer;
import com.customwebbuilder.catalog.services.ProductsService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Optional;

/**
 * Decorator that mirrors every committed product write into the search index.
 *
 * <p>It implements the same {@link ProductsService} contract as {@link ProductsServiceImpl} and delegates on it, so
 * the database stays the only source of truth and the persistence implementation does not depend on OpenSearch. The
 * mirroring is registered with {@link TransactionSynchronizationManager} and runs after the transaction commits, or
 * immediately when the call is not part of a transaction. The product is reloaded before indexing so the document
 * carries the values finally stored, including the generated timestamps. A failing index write never breaks the
 * relational write, because {@link ProductSearchIndexer} logs and swallows incremental failures.
 *
 * <p>It is the primary {@link ProductsService} bean, so every injection point gets the mirroring without naming this
 * class.
 */
@Slf4j
@Service
@Primary
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductSynchronizingServiceImpl implements ProductsService {

    private final ProductsServiceImpl productsService;
    private final ProductSearchIndexer productSearchIndexer;

    @Override
    public List<Product> findAll() {
        return productsService.findAll();
    }

    @Override
    public Page<Product> findAll(Pageable pageable) {
        return productsService.findAll(pageable);
    }

    @Override
    public Page<Product> findByCategoryName(String categoryName, Pageable pageable) {
        return productsService.findByCategoryName(categoryName, pageable);
    }

    @Override
    public Product findById(Long id) {
        return productsService.findById(id);
    }

    @Override
    public Optional<Product> findBySku(String sku) {
        return productsService.findBySku(sku);
    }

    @Transactional(readOnly = false)
    @Override
    public Product create(Product product) {
        Product savedProduct = productsService.create(product);

        mirrorProductAfterCommit(savedProduct.getId());

        return savedProduct;
    }

    @Transactional(readOnly = false)
    @Override
    public Product update(Long id, Product updatedProduct) {
        Product savedProduct = productsService.update(id, updatedProduct);

        mirrorProductAfterCommit(savedProduct.getId());

        return savedProduct;
    }

    @Transactional(readOnly = false)
    @Override
    public void delete(Long id) {
        productsService.delete(id);

        runAfterCommit(() -> productSearchIndexer.delete(id));
    }

    /**
     * Mirrors a committed product into the search index.
     *
     * <p>The product is read again through the wrapped service instead of indexing the in-memory instance, so the
     * document carries the values finally stored in the database, including the generated timestamps, and the decorator
     * does not reach the persistence layer on its own.
     *
     * @param productId identifier of the product to mirror
     */
    private void mirrorProductAfterCommit(Long productId) {
        runAfterCommit(() -> {
            Product product;

            try {
                product = productsService.findById(productId);
            } catch (EntityNotFoundException _) {
                log.atWarn()
                        .addKeyValue(LoggingKeys.EVENT, "search_mirror_skipped")
                        .addKeyValue("productId", productId)
                        .addKeyValue("reason", "not_found")
                        .log("Skipped the search mirroring because the product no longer exists");

                return;
            }

            productSearchIndexer.index(productSearchIndexer.toDocument(product));
        });
    }

    /**
     * Runs the given action after the current transaction commits, or immediately when no transaction is active.
     *
     * @param action action that mirrors the committed change into the search index
     */
    private static void runAfterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }
}
