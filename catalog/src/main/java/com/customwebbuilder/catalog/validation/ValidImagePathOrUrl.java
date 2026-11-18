package com.customwebbuilder.catalog.validation;

import com.customwebbuilder.catalog.validation.validators.ImagePathOrUrlValidator;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * Marks an image reference that must be either an HTTP(S) link or a site relative route.
 *
 * <p>Accepted values are absolute links ({@code https://example.com/img.png}) whose domain is
 * whitelisted, and relative routes ({@code /img/photo.png}, {@code photo.jpg}). Any other scheme ({@code javascript:},
 * {@code data:}, {@code ftp:}) is rejected, so a stored reference can never carry a script that a generated site would
 * render; protocol-relative links ({@code //cdn.x/y.png}) are rejected too because their scheme is ambiguous, a bare
 * directory ({@code /}, {@code .}, {@code ..}) is rejected because it is not an image, and absolute links outside the
 * whitelist are rejected. Null and blank values are accepted because the image itself is optional.
 */
@Documented
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.METHOD, ElementType.ANNOTATION_TYPE, ElementType.TYPE_USE})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ImagePathOrUrlValidator.class)
public @interface ValidImagePathOrUrl {

    /**
     * Message reported for every value that is neither an HTTP(S) link nor a relative route.
     *
     * @return the violation message shown in the {@code 400} response
     */
    String message() default "must be an http(s) link or a relative image route";

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
