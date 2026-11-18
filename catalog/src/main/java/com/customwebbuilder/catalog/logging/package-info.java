/**
 * Structured logging vocabulary of the catalog service.
 *
 * <p>Log statements are written with the SLF4J fluent API and carry key-value pairs. The keys live in
 * {@link com.customwebbuilder.catalog.logging.LoggingKeys} because dashboards and alerts query them by name, so a typo
 * in one class would silently hide a field from the collected logs.
 */
package com.customwebbuilder.catalog.logging;
