package com.customwebbuilder.catalog.models.dtos.input;

import com.customwebbuilder.catalog.validation.ValidCategory;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;

/**
 * Payload accepted by the relational product endpoint.
 *
 * <p>It only exposes the fields that endpoint owns; a product created through it starts with the default value of
 * every column it does not carry, which is why the search endpoints use {@link ProductSearchInputDTO} instead. The
 * categories travel as identifiers and are resolved against the database by the input mapper.
 */
@Data
@Valid
@JsonIgnoreProperties(ignoreUnknown = true)
public class ProductInputDTO {
    @NotBlank
    private String name;

    @NotNull
    private Set<@ValidCategory Long> categories = new HashSet<>();

    private Boolean active = true;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = false)
    @Digits(integer = 10, fraction = 2)
    private BigDecimal price;

    @NotNull
    @Min(0)
    private Integer stockQuantity;

    @NotBlank
    @Size(max = 50)
    private String sku;
}
