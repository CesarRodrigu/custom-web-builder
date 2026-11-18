package com.customwebbuilder.catalog.models.dtos.output;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

/**
 * Public representation of a product.
 *
 * <p>It is shared by the relational and the search endpoints so both return the same shape, and it is also built from
 * a search document, therefore every field it declares must exist in the index as well.
 */
@Data
@JsonPropertyOrder({"id"})
public class ProductOutputDTO {

    private Long id;

    private String name;

    private String description;

    private String sku;

    private BigDecimal price;

    private BigDecimal salePrice;

    private Integer stockQuantity;

    private String brand;

    private String imageUrl;

    private Set<String> imageUrls = new HashSet<>();

    private Set<CategoryOutputDTO> categories = new HashSet<>();

    private Boolean active = true;

    private Instant createdAt;

    private Instant updatedAt;
}
