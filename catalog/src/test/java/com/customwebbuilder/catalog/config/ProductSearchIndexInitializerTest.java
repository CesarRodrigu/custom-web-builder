package com.customwebbuilder.catalog.config;

import com.customwebbuilder.catalog.BaseTest;
import com.customwebbuilder.catalog.logging.LoggingKeys;
import com.customwebbuilder.catalog.services.ProductSearchService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.MDC;
import org.springframework.boot.ApplicationArguments;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ProductSearchIndexInitializer}, covering the startup rebuild and its tolerance to an
 * unavailable search backend.
 */
@ExtendWith(MockitoExtension.class)
class ProductSearchIndexInitializerTest extends BaseTest {

    @Mock
    private ProductSearchService productSearchService;

    @InjectMocks
    private ProductSearchIndexInitializer initializer;

    @Test
    void rebuildsTheIndexWhenTheApplicationStarts() {
        ApplicationArguments args = mock(ApplicationArguments.class);
        when(productSearchService.reindexIfEmpty()).thenReturn(4L);

        initializer.run(args);

        verify(productSearchService).reindexIfEmpty();
    }

    @Test
    void skipsTheRebuildWhenTheIndexIsAlreadyPopulated() {
        ApplicationArguments args = mock(ApplicationArguments.class);
        when(productSearchService.reindexIfEmpty()).thenReturn(0L);

        assertThatCode(() -> initializer.run(args)).doesNotThrowAnyException();

        verify(productSearchService).reindexIfEmpty();
    }

    @Test
    void keepsStartingWhenTheSearchBackendIsUnavailable() {
        ApplicationArguments args = mock(ApplicationArguments.class);
        when(productSearchService.reindexIfEmpty())
                .thenThrow(new RuntimeException("OpenSearch is down"));

        assertThatCode(() -> initializer.run(args)).doesNotThrowAnyException();
    }

    @Test
    void clearsTheEntryPointMarkerEvenWhenTheBootstrapFails() {
        ApplicationArguments args = mock(ApplicationArguments.class);
        when(productSearchService.reindexIfEmpty())
                .thenThrow(new RuntimeException("OpenSearch is down"));

        initializer.run(args);

        assertThat(MDC.get(LoggingKeys.ENTRY_POINT)).isNull();
    }
}


