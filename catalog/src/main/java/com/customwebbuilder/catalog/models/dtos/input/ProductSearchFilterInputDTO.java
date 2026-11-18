package com.customwebbuilder.catalog.models.dtos.input;

import com.customwebbuilder.catalog.validation.ValidPriceRange;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Filters accepted by the product search, bound from the query parameters of the request.
 *
 * <p>Every filter is optional, so an empty instance searches the whole index. The bounds are validated one by one and
 * the order between them is checked by {@link ValidPriceRange}, which reports the violation on {@code minPrice} so the
 * {@code 400} response keeps the same {@code field → message} shape as the rest of the API.
 */
@Data
@ValidPriceRange
public class ProductSearchFilterInputDTO {

    /**
     * Free text matched against the name, the description and the brand.
     */
    @Schema(description = "Free text matched against the name, the description and the brand")
    private String q;

    /**
     * Exact name of the category used as filter.
     */
    @Schema(description = "Exact name of the category used as filter")
    private String category;

    /**
     * Active flag used as filter.
     */
    @Schema(description = "Active flag used as filter; omit it to include both active and inactive products")
    private Boolean active;

    /**
     * Lowest accepted price, inclusive.
     */
    @Schema(description = "Lowest accepted price, inclusive")
    @DecimalMin(value = "0.0")
    @Digits(integer = 10, fraction = 2)
    private BigDecimal minPrice;

    /**
     * Highest accepted price, inclusive.
     */
    @Schema(description = "Highest accepted price, inclusive")
    @DecimalMin(value = "0.0")
    @Digits(integer = 10, fraction = 2)
    private BigDecimal maxPrice;
}
