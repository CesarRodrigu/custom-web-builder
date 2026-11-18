package com.customwebbuilder.catalog.models.dtos.output;

import com.customwebbuilder.catalog.models.search.FacetBucket;
import com.customwebbuilder.catalog.models.search.PriceBounds;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.web.PagedModel;

import java.util.List;
import java.util.Map;

/**
 * Response of the product search: the requested page, the facet counts and the limits of the price slider.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonPropertyOrder({"products", "facets", "priceBounds"})
public class ProductSearchOutputDTO {

    /**
     * Products of the requested page with their pagination metadata.
     */
    private PagedModel<ProductOutputDTO> products;

    /**
     * Bucket counts grouped by facet key.
     */
    private Map<String, List<FacetBucket>> facets;

    /**
     * Lowest and highest price of the whole index, null-bounded when it has no products.
     */
    private PriceBounds priceBounds;
}
