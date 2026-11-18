package com.customwebbuilder.catalog.models.dtos.input;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import lombok.Data;

/**
 * Payload used to send a category to the API.
 *
 * <p>It carries both the identifier and the name because the same type is used to reference an existing category and
 * to describe a new one.
 */
@Data
@Valid
@JsonIgnoreProperties(ignoreUnknown = true)
public class CategoryInputDTO {
    private Long id;

    private String name;

}
