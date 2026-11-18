package com.customwebbuilder.catalog.controllers;

import com.customwebbuilder.catalog.logging.LoggingKeys;
import com.customwebbuilder.catalog.mappers.ProductOutputMapper;
import com.customwebbuilder.catalog.models.Category;
import com.customwebbuilder.catalog.models.Product;
import com.customwebbuilder.catalog.models.dtos.output.ProductOutputDTO;
import com.customwebbuilder.catalog.models.dtos.output.SeedOutputDTO;
import com.customwebbuilder.catalog.services.CategoryService;
import com.customwebbuilder.catalog.services.ProductsService;
import io.swagger.v3.oas.annotations.Hidden;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Loads the smoke dataset (two categories and five products) on demand. The same rows ship in
 * {@code src/main/resources/data.sql}, so both entry points keep the database consistent whether the data is loaded at
 * startup or through HTTP.
 */
@Slf4j
@Hidden
@RestController
@RequiredArgsConstructor
@RequestMapping(path = "/test", version = "1+")
public class SeedController {
    private static final String ELECTRONICS_CATEGORY = "Electrónica";
    private static final String COMPUTING_CATEGORY = "Informática";
    private static final List<SeedProduct> SMOKE_PRODUCTS = List.of(
            new SeedProduct(
                    "iPhone 16",
                    "Smartphone Apple con pantalla OLED de 6,1 pulgadas",
                    "ELEC-001",
                    "89.90", "84.90", 25, "Apple",
                    "https://placehold.co/600x600?text=iPhone+16",
                    ELECTRONICS_CATEGORY
            ),
            new SeedProduct(
                    "Samsung Galaxy S25",
                    "Smartphone Android de gama alta",
                    "ELEC-002",
                    "95.900", null, 18, "Samsung",
                    "https://placehold.co/600x600?text=Galaxy+S25",
                    ELECTRONICS_CATEGORY
            ),
            new SeedProduct(
                    "MacBook Air M4",
                    "Portátil ligero para trabajo y estudio",
                    "ELEC-003",
                    "1199.00", "1099.00", 12, "Apple",
                    "https://placehold.co/600x600?text=MacBook+Air",
                    COMPUTING_CATEGORY
            ),
            new SeedProduct(
                    "Monitor Dell UltraSharp 27",
                    "Monitor de 27 pulgadas para trabajo profesional",
                    "MON-001",
                    "449.00", null, 8, "Dell",
                    "https://placehold.co/600x600?text=Dell+Monitor",
                    COMPUTING_CATEGORY
            ),
            new SeedProduct(
                    "Teclado Keychron K2",
                    "Teclado mecánico compacto inalámbrico",
                    "ACC-002",
                    "89.99", "79.99", 20, "Keychron",
                    "https://placehold.co/600x600?text=Keychron+K2",
                    COMPUTING_CATEGORY
            )
    );
    private final ProductOutputMapper productOutputMapper;
    private final CategoryService categoryService;
    private final ProductsService productsService;


    /**
     * Returns a sample category, creating it when it does not exist yet.
     *
     * <p>It is a leftover used for manual experiments, not part of the catalog API.
     *
     * @return the persisted sample category
     */
    @GetMapping("/2")
    public Category prueba() {

        return categoryService.findOrCreate("Prueba");
    }

    /**
     * Returns the name of the thread group that serves the request after a short delay.
     *
     * <p>It is a leftover used to observe the request handling thread pool manually, not part of the catalog API.
     *
     * @return the string representation of the current thread group
     *
     * @throws InterruptedException when the thread is interrupted while waiting
     */
    @GetMapping("/thread")
    public String getThreadName() throws InterruptedException {
        Thread.sleep(Duration.ofSeconds(3));
        return Thread.currentThread().getThreadGroup().toString();
    }

    /**
     * Creates the smoke dataset through the services layer. Rows identified by their natural key (category name,
     * product SKU) are left untouched, so the endpoint can be called repeatedly without duplicating data.
     *
     * @return summary with the categories ensured and the products created or skipped
     */
    @PostMapping("/smoke")
    @ResponseStatus(HttpStatus.CREATED)
    public SeedOutputDTO seedSmoke() {
        log.atInfo()
                .addKeyValue(LoggingKeys.EVENT, "smoke_seed_started")
                .addKeyValue("dataset", "smoke")
                .log("Starting the smoke dataset seed");

        Category electronics = categoryService.findOrCreate(ELECTRONICS_CATEGORY);
        Category computing = categoryService.findOrCreate(COMPUTING_CATEGORY);

        Map<String, Category> categories = Map.of(
                ELECTRONICS_CATEGORY, electronics,
                COMPUTING_CATEGORY, computing
        );

        int productsCreated = 0;
        int productsSkipped = 0;
        for (SeedProduct seedProduct : SMOKE_PRODUCTS) {
            if (productsService.findBySku(seedProduct.sku()).isPresent()) {
                productsSkipped++;

                log.atDebug()
                        .addKeyValue(LoggingKeys.EVENT, "smoke_seed_product_skipped")
                        .addKeyValue("sku", seedProduct.sku())
                        .addKeyValue("reason", "already_exists")
                        .log("Skipped a smoke product that already exists");

                continue;
            }

            productsService.create(toProduct(seedProduct, categories.get(seedProduct.categoryName())));
            productsCreated++;
        }

        log.atInfo()
                .addKeyValue(LoggingKeys.EVENT, "smoke_seed_completed")
                .addKeyValue("dataset", "smoke")
                .addKeyValue("productsCreated", productsCreated)
                .addKeyValue("productsSkipped", productsSkipped)
                .log("Smoke dataset seed completed");

        return new SeedOutputDTO(
                List.of(ELECTRONICS_CATEGORY, COMPUTING_CATEGORY),
                productsCreated,
                productsSkipped
        );
    }

    /**
     * Builds an unsaved product from one row of the smoke dataset, linked to its category.
     *
     * @param seedProduct values to copy onto the product
     * @param category    category the product belongs to, never null
     *
     * @return a new product ready to be persisted by the service
     */
    private static Product toProduct(SeedProduct seedProduct, Category category) {
        Product product = new Product();

        product.setName(seedProduct.name());
        product.setDescription(seedProduct.description());
        product.setSku(seedProduct.sku());
        product.setPrice(new BigDecimal(seedProduct.price()));
        product.setSalePrice(
                seedProduct.salePrice() == null ? null : new BigDecimal(seedProduct.salePrice())
        );
        product.setStockQuantity(seedProduct.stockQuantity());
        product.setBrand(seedProduct.brand());
        product.setImageUrl(seedProduct.imageUrl());
        if (seedProduct.imageUrl() != null) {
            product.getImageUrls().add(seedProduct.imageUrl());
        }
        product.setActive(true);

        Set<Category> productCategories = new HashSet<>();
        productCategories.add(category);
        product.setCategories(productCategories);

        return product;
    }

    /**
     * Returns every product of the catalog, without pagination.
     *
     * @return all the products
     */
    @GetMapping({"", "/"})
    public List<ProductOutputDTO> getProducts() {
        return productOutputMapper.toDTOs(productsService.findAll());
    }

    /**
     * One row of the smoke dataset. Prices stay as text so a missing discount can be expressed as {@code null} without
     * unboxing.
     *
     * @param name          product name
     * @param description   short commercial description
     * @param sku           unique stock keeping unit, also the idempotency key
     * @param price         regular price as a decimal string
     * @param salePrice     discounted price as a decimal string, or null
     * @param stockQuantity units available
     * @param brand         commercial brand
     * @param imageUrl      placeholder image URL, also added as the only entry of the image gallery
     * @param categoryName  name of the category this product belongs to
     */
    private record SeedProduct(
            String name,
            String description,
            String sku,
            String price,
            String salePrice,
            int stockQuantity,
            String brand,
            String imageUrl,
            String categoryName
    ) {
    }
}
