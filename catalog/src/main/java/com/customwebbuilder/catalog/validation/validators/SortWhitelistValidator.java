package com.customwebbuilder.catalog.validation.validators;

import com.customwebbuilder.catalog.models.enums.ProductSortField;
import com.customwebbuilder.catalog.validation.ValidSort;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * Validates {@link ValidSort} on the pageable of the paginated endpoints.
 *
 * <p>The violation is built with a property node on {@code sort} and keeps the message of the rejected field, so the
 * translation of {@link jakarta.validation.ConstraintViolationException} keys the failure by the request parameter the
 * client has to correct and the text names the offending property.
 */
public class SortWhitelistValidator implements ConstraintValidator<ValidSort, Pageable> {

    /**
     * Accepts a pageable without ordering, or whose every ordering field belongs to the whitelist.
     */
    @Override
    public boolean isValid(Pageable pageable, ConstraintValidatorContext context) {
        if (pageable == null) {
            return true;
        }

        for (Sort.Order order : pageable.getSort()) {
            if (!ProductSortField.isSupported(order.getProperty())) {
                context.disableDefaultConstraintViolation();
                context.buildConstraintViolationWithTemplate("Unsupported sort field: " + order.getProperty())
                        .addPropertyNode("sort")
                        .addConstraintViolation();

                return false;
            }
        }

        return true;
    }
}
