package com.customwebbuilder.catalog.validation;

import com.customwebbuilder.catalog.BaseTest;
import com.customwebbuilder.catalog.models.dtos.input.ProductSearchFilterInputDTO;
import com.customwebbuilder.catalog.validation.validators.PriceRangeValidator;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link ValidPriceRange} through {@link PriceRangeValidator}, covering the accepted combinations of the
 * price bounds and the property the violation points at.
 */
class PriceRangeValidatorTest extends BaseTest {

    private static final String MIN_PRICE = "minPrice";

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void acceptsAFilterWithoutPriceBounds() {
        assertThat(violationsOf(null, null)).isEmpty();
    }

    private Set<ConstraintViolation<ProductSearchFilterInputDTO>> violationsOf(BigDecimal minPrice, BigDecimal maxPrice) {
        ProductSearchFilterInputDTO filter = new ProductSearchFilterInputDTO();
        filter.setMinPrice(minPrice);
        filter.setMaxPrice(maxPrice);

        return validator.validate(filter);
    }

    @Test
    void acceptsAMissingFilterBecauseTheConstraintOnlyAppliesToAPresentOne() {
        assertThat(new PriceRangeValidator().isValid(null, null)).isTrue();
    }

    @Test
    void acceptsAFilterWithOnlyOnePriceBound() {
        assertThat(violationsOf(BigDecimal.TEN, null)).isEmpty();
        assertThat(violationsOf(null, BigDecimal.TEN)).isEmpty();
    }

    @Test
    void acceptsAnOrderedRangeIncludingEqualBounds() {
        assertThat(violationsOf(new BigDecimal("10.00"), new BigDecimal("100.00"))).isEmpty();
        assertThat(violationsOf(new BigDecimal("50.00"), new BigDecimal("50.00"))).isEmpty();
    }

    @Test
    void reportsTheLowerBoundWhenItIsHigherThanTheUpperBound() {
        Set<ConstraintViolation<ProductSearchFilterInputDTO>> violations =
                violationsOf(new BigDecimal("100.00"), new BigDecimal("10.00"));

        assertThat(violations).singleElement().satisfies(violation -> {
            assertThat(violation.getPropertyPath()).hasToString(MIN_PRICE);
            assertThat(violation.getMessage()).isEqualTo("must be lower than or equal to maxPrice");
        });
    }
}
