/**
 * Spring Data JPA repositories of the catalog.
 *
 * <p>They read and write the database, which is the source of truth. The queries that feed a response initialise the
 * lazy collections with an entity graph, and the collection filters are expressed as {@code exists} subqueries so the
 * pagination is not distorted by duplicated rows.
 */
package com.customwebbuilder.catalog.repositories;
