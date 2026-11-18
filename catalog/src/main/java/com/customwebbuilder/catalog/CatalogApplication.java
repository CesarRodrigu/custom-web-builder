package com.customwebbuilder.catalog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point of the catalog service.
 *
 * <p>It only boots the Spring context; the components, the persistence layer and the search index are wired by the
 * auto-configuration plus the classes of this package tree.
 */
@SpringBootApplication
public class CatalogApplication {

    static void main(String[] args) {
        SpringApplication.run(CatalogApplication.class, args);
    }

}
