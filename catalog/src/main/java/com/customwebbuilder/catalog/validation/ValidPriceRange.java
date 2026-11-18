package com.customwebbuilder.catalog.validation;

import com.customwebbuilder.catalog.validation.validators.PriceRangeValidator;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * Marks a filter whose lower price bound must not be higher than its upper bound.
 *
 * <p>Bean Validation constrains one property at a time, so the relation between two prices cannot be expressed with a
 * field annotation. This class level constraint closes that gap: the violation is reported on the lower bound, which is
 * the property the client has to fix. Missing bounds are accepted because both filters are optional, and equal bounds
 * are accepted because the range is inclusive.
 */
@Documented
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PriceRangeValidator.class)
public @interface ValidPriceRange {

    /**
     * Message reported when the lower bound is higher than the upper bound.
     *
     * @return the violation message shown in the {@code 400} response
     */
    String message() default "must be lower than or equal to maxPrice";

    /**
     * Validation groups; unused because the constraint always applies with the default group.
     *
     * @return the empty group list
     */
    Class<?>[] groups() default {};

    /**
     * Payload carriers; unused because the constraint only reports violations.
     *
     * @return the empty payload list
     */
    Class<? extends Payload>[] payload() default {};
}
