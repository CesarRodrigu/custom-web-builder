package com.customwebbuilder.catalog.models.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Price buckets of the product search facet.
 *
 * <p>The last bucket is open ended: {@code to} is null and the range has no upper bound.
 */
@Getter
@RequiredArgsConstructor
public enum PriceRange {

    /**
     * Products priced below 25.
     */
    UNDER_25("0-25", 0d, 25d),

    /**
     * Products priced from 25 up to 50.
     */
    FROM_25_TO_50("25-50", 25d, 50d),

    /**
     * Products priced from 50 up to 100.
     */
    FROM_50_TO_100("50-100", 50d, 100d),

    /**
     * Products priced from 100 upwards, with no upper bound.
     */
    FROM_100("100+", 100d, null);

    private final String key;
    private final double from;
    private final Double to;
}
