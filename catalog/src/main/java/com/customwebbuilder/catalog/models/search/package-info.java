/**
 * OpenSearch representation of the catalog.
 *
 * <p>The mapping is declared explicitly on every field, because the index is created by the application instead of
 * being detected dynamically. Money is stored in cents so the two decimals survive the round trip, and the identifier
 * is stored in the source document so ordering by it stays deterministic.
 */
package com.customwebbuilder.catalog.models.search;
