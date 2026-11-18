package com.customwebbuilder.catalog.models.dtos.output;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Data;

/**
 * Category as returned by the API.
 *
 * <p>It only exposes the identity and the name, which are the two fields a client needs to render a filter or to link
 * a product to its category.
 */
@Data
@JsonPropertyOrder({"id"})
public class CategoryOutputDTO {
    private Long id;

    private String name;

}
