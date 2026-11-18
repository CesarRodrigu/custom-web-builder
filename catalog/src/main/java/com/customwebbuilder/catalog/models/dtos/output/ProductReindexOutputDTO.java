package com.customwebbuilder.catalog.models.dtos.output;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of a full reindex of the product search index.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonPropertyOrder({"indexName", "indexed"})
public class ProductReindexOutputDTO {

    /**
     * Name of the rebuilt OpenSearch index.
     */
    private String indexName;

    /**
     * Number of products written during the rebuild.
     */
    private long indexed;
}
