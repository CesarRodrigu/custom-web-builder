package com.customwebbuilder.catalog.config;

import com.customwebbuilder.catalog.logging.LoggingKeys;
import com.customwebbuilder.catalog.services.ProductSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.slf4j.MDC;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Bootstraps the product search index when the application starts.
 *
 * <p>The index is created when it does not exist and rebuilt from the database only when it is empty. A search backend
 * that is not available yet must not prevent the application from starting, so failures are logged and ignored.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(
        prefix = "catalog.search",
        name = "reindex-on-startup",
        havingValue = "true",
        matchIfMissing = true
)
public class ProductSearchIndexInitializer implements ApplicationRunner {

    private final ProductSearchService productSearchService;


    /**
     * Ensures the index exists and rebuilds it when it does not contain any product yet.
     *
     * @param args arguments received by the application, not used by this initializer
     */
    @Override
    public void run(@NonNull ApplicationArguments args) {
        MDC.put(LoggingKeys.ENTRY_POINT, LoggingKeys.ENTRY_POINT_STARTUP);

        try {
            long indexed = productSearchService.reindexIfEmpty();

            if (indexed > 0) {
                log.atInfo()
                        .addKeyValue(LoggingKeys.EVENT, "search_index_bootstrapped")
                        .addKeyValue("documentCount", indexed)
                        .log("Rebuilt the search index from the database on startup");
            } else {
                log.atDebug()
                        .addKeyValue(LoggingKeys.EVENT, "search_index_bootstrap_skipped")
                        .addKeyValue("reason", "index_already_populated_or_unavailable")
                        .log("Skipped the search index bootstrap on startup");
            }
        } catch (RuntimeException ex) {
            log.atWarn()
                    .addKeyValue(LoggingKeys.EVENT, "search_index_bootstrap_failed")
                    .setCause(ex)
                    .log("Skipped the OpenSearch bootstrap because the search backend is unavailable");
        } finally {
            MDC.remove(LoggingKeys.ENTRY_POINT);
        }
    }
}
