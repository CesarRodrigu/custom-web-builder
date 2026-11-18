package com.customwebbuilder.catalog.models.dtos.output;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Summary of a seed run: the categories ensured and how many products were created or skipped.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonPropertyOrder({"categories", "productsCreated", "productsSkipped"})
public class SeedOutputDTO {

    /**
     * Categories the seed ensured, in the order they are listed.
     */
    private List<String> categories;

    /**
     * Number of products inserted by the run.
     */
    private int productsCreated;

    /**
     * Number of products left untouched because their natural key already existed.
     */
    private int productsSkipped;
}
