package com.customwebbuilder.catalog.models.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Product fields accepted as the ordering criterion of the paginated search. Keeping the list closed avoids handing
 * arbitrary request text to the JPA sort and limits the ordering to columns that have a stable meaning for clients.
 *
 * <p>The whitelist is enforced before the controller body runs by
 * {@link com.customwebbuilder.catalog.validation.ValidSort}, which asks {@link #isSupported(String)} for every
 * requested field.
 */
@Getter
@RequiredArgsConstructor
public enum ProductSortField {

    /**
     * Product identifier.
     */
    ID("id"),

    /**
     * Product name.
     */
    NAME("name"),

    /**
     * Regular price of the product.
     */
    PRICE("price"),

    /**
     * Reduced price of the product.
     */
    SALE_PRICE("salePrice"),

    /**
     * Units available in stock.
     */
    STOCK_QUANTITY("stockQuantity"),

    /**
     * Moment the product was created.
     */
    CREATED_AT("createdAt"),

    /**
     * Moment the product was last updated.
     */
    UPDATED_AT("updatedAt");

    private static final Set<String> SUPPORTED_PROPERTIES = Arrays.stream(values())
            .map(ProductSortField::getProperty)
            .collect(Collectors.toUnmodifiableSet());

    private final String property;

    /**
     * Tells whether the given product property may be used as an ordering criterion.
     *
     * @param property property name received through the sort parameter
     *
     * @return true when the property belongs to the supported set
     */
    public static boolean isSupported(String property) {
        return SUPPORTED_PROPERTIES.contains(property);
    }
}
