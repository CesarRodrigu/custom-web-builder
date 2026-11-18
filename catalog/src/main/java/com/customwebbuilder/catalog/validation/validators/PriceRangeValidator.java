package com.customwebbuilder.catalog.validation.validators;

import com.customwebbuilder.catalog.models.dtos.input.ProductSearchFilterInputDTO;
import com.customwebbuilder.catalog.validation.ValidPriceRange;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Validates {@link ValidPriceRange} on the search filters.
 *
 * <p>The violation is built with a property node on {@code minPrice} instead of the default object node, so the
 * translation of {@link jakarta.validation.ConstraintViolationException} and the binding errors of the request keep
 * keying the failure by the field the client has to correct.
 */
public class PriceRangeValidator implements ConstraintValidator<ValidPriceRange, ProductSearchFilterInputDTO> {

    /**
     * Accepts a filter without bounds, with a single bound, or with a lower bound that is lower than or equal to the
     * upper one.
     */
    @Override
    public boolean isValid(ProductSearchFilterInputDTO filter, ConstraintValidatorContext context) {
        if (filter == null || filter.getMinPrice() == null || filter.getMaxPrice() == null
                || filter.getMinPrice().compareTo(filter.getMaxPrice()) <= 0) {
            return true;
        }

        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
                .addPropertyNode("minPrice")
                .addConstraintViolation();

        return false;
    }
}
