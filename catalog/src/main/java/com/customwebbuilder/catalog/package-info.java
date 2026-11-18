/**
 * Catalog service of the custom web builder.
 *
 * <p>A Spring Boot REST API over a product catalog. The database is the source of truth and OpenSearch is a derived
 * read
 * index, mirrored after every committed write. The packages are organised by responsibility:
 * {@link com.customwebbuilder.catalog.controllers} exposes HTTP, {@link com.customwebbuilder.catalog.services} holds
 * the business operations, {@link com.customwebbuilder.catalog.repositories} reads and writes the relational store and
 * {@link com.customwebbuilder.catalog.models} holds the entities, the DTOs and the search documents.
 *
 * <p>The entry point of the application is {@link com.customwebbuilder.catalog.CatalogApplication}.
 */
package com.customwebbuilder.catalog;
