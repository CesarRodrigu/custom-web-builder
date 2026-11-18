package com.customwebbuilder.catalog.models.dtos.input;

import com.customwebbuilder.catalog.validation.ValidImagePathOrUrl;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;

/**
 * Complete product payload accepted by the search endpoints.
 *
 * <p>Unlike {@link ProductInputDTO}, which only carries the fields needed to create a product through the relational
 * API, this DTO describes the whole product. It can therefore be mirrored safely into the database and OpenSearch
 * without clearing the columns the shared input DTO does not expose.
 */
@Data
@Valid
@JsonIgnoreProperties(ignoreUnknown = true)
public class ProductSearchInputDTO {

    @NotBlank
    @Size(max = 150)
    private String name;

    @Size(max = 2000)
    private String description;

    @NotBlank
    @Size(max = 50)
    private String sku;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = false)
    @Digits(integer = 10, fraction = 2)
    private BigDecimal price;

    @DecimalMin(value = "0.0")
    @Digits(integer = 10, fraction = 2)
    private BigDecimal salePrice;

    @NotNull
    @Min(0)
    private Integer stockQuantity;

    @Size(max = 100)
    private String brand;

    @Size(max = 500)
    @ValidImagePathOrUrl
    private String imageUrl;

    @Size(max = 10)
    private Set<@Size(max = 500) @ValidImagePathOrUrl String> imageUrls = new HashSet<>();

    @NotNull
    private Set<Long> categories = new HashSet<>();

    @NotNull
    private Boolean active = true;
}
