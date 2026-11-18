package com.customwebbuilder.catalog.services;

import com.customwebbuilder.catalog.BaseTest;
import com.customwebbuilder.catalog.models.Product;
import com.customwebbuilder.catalog.models.search.ProductSearchDocument;
import com.customwebbuilder.catalog.services.impl.ProductSynchronizingServiceImpl;
import com.customwebbuilder.catalog.services.impl.ProductsServiceImpl;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductSynchronizingServiceImplTest extends BaseTest {

    @Mock
    private ProductsServiceImpl productsService;

    @Mock
    private ProductSearchIndexer productSearchIndexer;

    @InjectMocks
    private ProductSynchronizingServiceImpl synchronizationService;

    @AfterEach
    void clearTransactionSynchronization() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void delegatesTheReadsToTheWrappedService() {
        Product product = productWithId(1L);
        when(productsService.findById(1L)).thenReturn(product);

        Product result = synchronizationService.findById(1L);

        assertThat(result).isSameAs(product);
    }

    private static Product productWithId(Long id) {
        Product product = new Product();
        product.setId(id);
        product.setCategories(new HashSet<>());
        return product;
    }

    @Test
    void delegatesThePagedCategorySearchToTheWrappedService() {
        Page<Product> page = new PageImpl<>(List.of(productWithId(1L)), PageRequest.of(0, 2), 1);
        when(productsService.findByCategoryName("Informática", PageRequest.of(0, 2))).thenReturn(page);

        Page<Product> result = synchronizationService.findByCategoryName("Informática", PageRequest.of(0, 2));

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void delegatesTheFullListingToTheWrappedService() {
        List<Product> products = List.of(productWithId(1L), productWithId(2L));
        when(productsService.findAll()).thenReturn(products);

        List<Product> result = synchronizationService.findAll();

        assertThat(result).isSameAs(products);
    }

    @Test
    void delegatesThePagedListingToTheWrappedService() {
        Page<Product> page = new PageImpl<>(List.of(productWithId(1L)), PageRequest.of(0, 2), 1);
        when(productsService.findAll(PageRequest.of(0, 2))).thenReturn(page);

        Page<Product> result = synchronizationService.findAll(PageRequest.of(0, 2));

        assertThat(result).isSameAs(page);
    }

    @Test
    void delegatesTheSkuLookupToTheWrappedService() {
        Product product = productWithId(4L);
        when(productsService.findBySku("KB-001")).thenReturn(Optional.of(product));

        assertThat(synchronizationService.findBySku("KB-001")).containsSame(product);
    }

    @Test
    void indexesTheCreatedProductAfterTheTransactionCommits() {
        Product product = productWithId(5L);
        ProductSearchDocument document = documentWithId(5L);

        when(productsService.create(product)).thenReturn(product);
        when(productsService.findById(5L)).thenReturn(product);
        when(productSearchIndexer.toDocument(product)).thenReturn(document);

        TransactionSynchronizationManager.initSynchronization();
        synchronizationService.create(product);

        verify(productSearchIndexer, never()).index(any());

        TransactionSynchronizationManager.getSynchronizations()
                .forEach(TransactionSynchronization::afterCommit);

        verify(productSearchIndexer).index(document);
    }

    private static ProductSearchDocument documentWithId(Long id) {
        ProductSearchDocument document = new ProductSearchDocument();
        document.setId(id);
        return document;
    }

    @Test
    void indexesTheProductImmediatelyWhenThereIsNoActiveTransaction() {
        Product product = productWithId(6L);
        ProductSearchDocument document = documentWithId(6L);

        when(productsService.create(product)).thenReturn(product);
        when(productsService.findById(6L)).thenReturn(product);
        when(productSearchIndexer.toDocument(product)).thenReturn(document);

        synchronizationService.create(product);

        verify(productSearchIndexer).index(document);
    }

    @Test
    void reindexesTheProductAfterTheUpdateCommits() {
        Product product = productWithId(7L);
        ProductSearchDocument document = documentWithId(7L);

        when(productsService.update(7L, product)).thenReturn(product);
        when(productsService.findById(7L)).thenReturn(product);
        when(productSearchIndexer.toDocument(product)).thenReturn(document);

        synchronizationService.update(7L, product);

        verify(productsService).update(7L, product);
        verify(productSearchIndexer).index(document);
    }

    @Test
    void removesTheDeletedProductFromTheIndexImmediatelyWhenThereIsNoActiveTransaction() {
        synchronizationService.delete(3L);

        verify(productsService).delete(3L);
        verify(productSearchIndexer).delete(3L);
    }

    @Test
    void skipsTheIndexWhenTheProductDisappearedBeforeTheMirroring() {
        Product product = productWithId(9L);

        when(productsService.create(product)).thenReturn(product);
        when(productsService.findById(9L)).thenThrow(new EntityNotFoundException("Product not found with id: 9"));

        synchronizationService.create(product);

        verify(productSearchIndexer, never()).index(any());
    }
}
