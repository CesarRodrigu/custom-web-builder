package com.customwebbuilder.catalog.controllers;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcBuilderCustomizer;
import org.springframework.test.web.servlet.setup.ConfigurableMockMvcBuilder;
import org.springframework.web.client.ApiVersionInserter;

/**
 * Shared support for the MVC slices that exercise the versioned API.
 *
 * <p>The request paths of a test never carry the version segment. The configuration below teaches the mock builder to
 * write it on the requests that select one, in the path segment the application declares and with the same {@code v}
 * prefix that {@link com.customwebbuilder.catalog.config.WebConfig} adds to the controllers, so the request reaches
 * the URL the application serves. The tests that keep the default version build it with {@link #url(String, String)},
 * read from {@code spring.mvc.apiversion.default}.
 */
public final class ApiVersionTestSupport {

    /**
     * Prefix added by {@link com.customwebbuilder.catalog.config.WebConfig} to every controller of the package.
     */
    public static final String API_PREFIX = "/api";

    /**
     * Letter that precedes the version number in the prefix declared by
     * {@link com.customwebbuilder.catalog.config.WebConfig}.
     */
    private static final String VERSION_PREFIX = "v";

    private ApiVersionTestSupport() {
    }

    /**
     * Builds the URL the application serves for a path of a controller mapped under {@code /api/v{version}}.
     *
     * @param version version segment of the URL
     * @param path    path after the controller mapping, starting with a slash
     *
     * @return the URL with the {@code /api} prefix and the version segment
     */
    public static String url(String version, String path) {
        return API_PREFIX + "/" + VERSION_PREFIX + version + path;
    }

    /**
     * Teaches the auto-configured {@link org.springframework.test.web.servlet.MockMvc} how to write the version of a
     * request that selects one.
     *
     * <p>Both the path segment and the {@code v} prefix come from the configuration and the application, so the tests
     * follow them instead of repeating the numbers.
     */
    @TestConfiguration
    public static class ApiVersionConfiguration implements MockMvcBuilderCustomizer {

        @Value("${spring.mvc.apiversion.use.path-segment}")
        private int pathSegment;

        @Override
        public void customize(ConfigurableMockMvcBuilder<?> builder) {
            builder.apiVersionInserter(ApiVersionInserter.builder()
                    .usePathSegment(pathSegment)
                    .withVersionFormatter(version -> VERSION_PREFIX + version)
                    .build());
        }
    }
}
