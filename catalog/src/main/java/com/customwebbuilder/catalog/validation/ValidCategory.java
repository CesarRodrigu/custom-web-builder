package com.customwebbuilder.catalog.validation;

import com.customwebbuilder.catalog.validation.validators.CategoryValidator;
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
@Target({
        ElementType.FIELD,
        ElementType.PARAMETER,
        ElementType.ANNOTATION_TYPE,
        ElementType.TYPE_USE
})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = CategoryValidator.class)
public @interface ValidCategory {


    String message() default "Category not valid";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
