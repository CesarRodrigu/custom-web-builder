package com.customwebbuilder.catalog.validation;

import com.customwebbuilder.catalog.validation.validators.SortWhitelistValidator;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * Marks a pageable whose ordering fields must belong to the supported sort whitelist.
 *
 * <p>{@code Sort} is a Spring type, so the whitelist cannot be expressed with field annotations. This constraint
 * closes that gap: the violation is reported on the {@code sort} parameter, which is the value the client has to fix,
 * so the {@code 400} response keeps the same {@code field → message} shape as the rest of the API.
 */
@Documented
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = SortWhitelistValidator.class)
public @interface ValidSort {

    /**
     * Message reported when at least one ordering field is not supported.
     *
     * @return the violation message shown in the {@code 400} response
     */
    String message() default "must contain only supported sort fields";

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
