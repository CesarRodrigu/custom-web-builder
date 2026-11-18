package com.customwebbuilder.catalog.logging;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Field names shared by the structured log statements of the service.
 *
 * <p>Dashboards and alerts query these keys, so keeping them in one place avoids a typo in a single class silently
 * hiding a field from the collected logs.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class LoggingKeys {

    /**
     * Structured field that names the business or technical event being logged.
     */
    public static final String EVENT = "event";

    /**
     * Structured field that identifies the entry point that produced the log line.
     */
    public static final String ENTRY_POINT = "entryPoint";

    /**
     * Entry point value used for work triggered while the application starts.
     */
    public static final String ENTRY_POINT_STARTUP = "startup";
}
