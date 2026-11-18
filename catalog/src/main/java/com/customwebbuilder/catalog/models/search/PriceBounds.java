package com.customwebbuilder.catalog.models.search;

import java.math.BigDecimal;

/**
 * Lowest and highest price the price slider can move between.
 *
 * <p>Both limits are read from the whole index, ignoring the requested filters, so the slider does not shrink while it
 * is being dragged. An index without products has no prices, which is represented with both limits set to null.
 *
 * @param min lowest indexed price, null when the index has no products
 * @param max highest indexed price, null when the index has no products
 */
public record PriceBounds(BigDecimal min, BigDecimal max) {

    /**
     * Bounds of an index without products.
     *
     * @return both limits set to null
     */
    public static PriceBounds empty() {
        return new PriceBounds(null, null);
    }
}
