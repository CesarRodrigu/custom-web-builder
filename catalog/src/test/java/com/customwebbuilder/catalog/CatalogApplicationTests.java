package com.customwebbuilder.catalog;

import com.customwebbuilder.catalog.controllers.ProductController;
import com.customwebbuilder.catalog.controllers.ProductSearchController;
import lombok.RequiredArgsConstructor;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

/**
 * Verifies that the application context loads with the development profile, which creates the schema and seeds the
 * smoke dataset, while the search index bootstrap is disabled to keep the test independent from OpenSearch.
 */
@ActiveProfiles("test")
@SpringBootTest(properties = "catalog.search.reindex-on-startup=false")
@Disabled
@RequiredArgsConstructor(onConstructor = @__(@Autowired))
class CatalogApplicationTests {
    private final ProductController productController;
    private final ProductSearchController productSearchController;

    @Test
    void contextLoads() {
        assertThat(productController).isNotNull();
        assertThat(productSearchController).isNotNull();
    }

}
