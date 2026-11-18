package com.customwebbuilder.catalog.services.impl;

import com.customwebbuilder.catalog.logging.LoggingKeys;
import com.customwebbuilder.catalog.models.Product;
import com.customwebbuilder.catalog.repositories.CategoryRepository;
import com.customwebbuilder.catalog.repositories.ProductRepository;
import com.customwebbuilder.catalog.services.ProductsService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;

/**
 * Database backed implementation of the product persistence.
 *
 * <p>It only reads and writes the relational store, which stays the single source of truth. The mirroring of the
 * committed writes into the search index lives in {@link ProductSynchronizingServiceImpl}, the decorator that wraps
 * this service, so the persistence code does not depend on OpenSearch.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductsServiceImpl implements ProductsService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    @Override
    public List<Product> findAll() {
        List<Product> products = productRepository.findAll();

        log.atDebug()
                .addKeyValue(LoggingKeys.EVENT, "products_listed")
                .addKeyValue("resultCount", products.size())
                .log("Listed all products");

        return products;
    }

    @Override
    public Page<Product> findAll(Pageable pageable) {
        Page<Product> products = productRepository.findAll(pageable);
        initialiseCategories(products);

        log.atDebug()
                .addKeyValue(LoggingKeys.EVENT, "products_page_listed")
                .addKeyValue("page", products.getNumber())
                .addKeyValue("pageSize", products.getSize())
                .addKeyValue("resultCount", products.getNumberOfElements())
                .addKeyValue("totalElements", products.getTotalElements())
                .addKeyValue("totalPages", products.getTotalPages())
                .addKeyValue("hasNext", products.hasNext())
                .addKeyValue("sort", pageable.getSort().toString())
                .log("Listed a page of products");

        return products;
    }


    @Override
    public Page<Product> findByCategoryName(String categoryName, Pageable pageable) {
        Page<Product> products = productRepository.findByCategoryName(categoryName, pageable);
        initialiseCategories(products);

        log.atDebug()
                .addKeyValue(LoggingKeys.EVENT, "products_searched_by_category")
                .addKeyValue("categoryName", categoryName)
                .addKeyValue("page", products.getNumber())
                .addKeyValue("pageSize", products.getSize())
                .addKeyValue("resultCount", products.getNumberOfElements())
                .addKeyValue("totalElements", products.getTotalElements())
                .log("Searched products by category");

        return products;
    }

    @Override
    public Product findById(Long id) {
        Optional<Product> product = productRepository.findWithCategoriesById(id);

        if (product.isEmpty()) {
            log.atDebug()
                    .addKeyValue(LoggingKeys.EVENT, "product_lookup_missed")
                    .addKeyValue("productId", id)
                    .log("Product not found");

            throw new EntityNotFoundException(
                    "Product not found with id: " + id
            );
        }

        return product.get();
    }

    @Override
    public Optional<Product> findBySku(String sku) {
        return productRepository.findBySku(sku);
    }

    @Transactional(readOnly = false)
    @Override
    public Product create(Product product) {
        categoryRepository.saveAll(product.getCategories());
        Product savedProduct = productRepository.save(product);

        log.atInfo()
                .addKeyValue(LoggingKeys.EVENT, "product_created")
                .addKeyValue("productId", savedProduct.getId())
                .addKeyValue("sku", savedProduct.getSku())
                .log("Product created");

        return savedProduct;
    }

    @Transactional(readOnly = false)
    @Override
    public Product update(Long id, Product updatedProduct) {
        Optional<Product> storedProduct = productRepository.findWithCategoriesById(id);

        if (storedProduct.isEmpty()) {
            log.atWarn()
                    .addKeyValue(LoggingKeys.EVENT, "product_update_rejected")
                    .addKeyValue("productId", id)
                    .addKeyValue("reason", "not_found")
                    .log("Cannot update a product that does not exist");

            throw new EntityNotFoundException(
                    "Product not found with id: " + id
            );
        }

        Product existingProduct = getExistingProduct(updatedProduct, storedProduct);

        Product savedProduct = productRepository.save(existingProduct);

        log.atInfo()
                .addKeyValue(LoggingKeys.EVENT, "product_updated")
                .addKeyValue("productId", savedProduct.getId())
                .addKeyValue("sku", savedProduct.getSku())
                .log("Product updated");

        return savedProduct;
    }

    private static @NonNull Product getExistingProduct(Product updatedProduct, Optional<Product> storedProduct) {
        Product existingProduct = storedProduct.get();
        if (updatedProduct.getName() != null) {
            existingProduct.setName(updatedProduct.getName());
        }
        if (updatedProduct.getDescription() != null) {
            existingProduct.setDescription(updatedProduct.getDescription());
        }
        if (updatedProduct.getSku() != null) {
            existingProduct.setSku(updatedProduct.getSku());
        }
        if (updatedProduct.getPrice() != null) {
            existingProduct.setPrice(updatedProduct.getPrice());
        }

        existingProduct.setSalePrice(updatedProduct.getSalePrice());
        existingProduct.setStockQuantity(updatedProduct.getStockQuantity());
        existingProduct.setBrand(updatedProduct.getBrand());
        existingProduct.setImageUrl(updatedProduct.getImageUrl());
        if (updatedProduct.getImageUrls() != null) {
            existingProduct.setImageUrls(new HashSet<>(updatedProduct.getImageUrls()));
        }
        existingProduct.setActive(updatedProduct.getActive());

        existingProduct.setCategories(
                updatedProduct.getCategories()
        );
        return existingProduct;
    }

    @Transactional(readOnly = false)
    @Override
    public void delete(Long id) {
        productRepository.deleteById(id);

        log.atInfo()
                .addKeyValue(LoggingKeys.EVENT, "product_deleted")
                .addKeyValue("productId", id)
                .log("Product deleted");
    }

    /**
     * Loads the categories of the products in the given page with a single query.
     *
     * <p>It is the second half of the read pattern: the page is queried alone so the database applies the filter, the
     * ordering and the limit, and only the categories of those products are initialised afterwards. A fetch join over a
     * paginated query would load every matching row in memory, and a lazy select per product would issue one query per
     * row while the response or the search document is mapped.
     *
     * @param products page whose products must have their categories initialised
     */
    private void initialiseCategories(Page<Product> products) {
        List<Long> productIds = products.getContent().stream()
                .map(Product::getId)
                .toList();

        if (!productIds.isEmpty()) {
            productRepository.findWithCategoriesByIdIn(productIds);
        }
    }
}
