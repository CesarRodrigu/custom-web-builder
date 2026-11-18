package com.customwebbuilder.catalog.controllers.handlers;

import com.customwebbuilder.catalog.logging.LoggingKeys;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * Translates bean and method validation failures into a {@code 400 Bad Request} response whose body maps each invalid
 * field or parameter to its message.
 */
@Slf4j
@RestControllerAdvice
@ResponseStatus(HttpStatus.BAD_REQUEST)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ValidationExceptionHandler {

    /**
     * Collects the field errors of a request argument that failed bean validation, either a request body or a filter
     * bound from the query parameters.
     *
     * @param ex exception raised when binding an annotated request argument
     *
     * @return one entry per invalid field, keyed by field name
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Map<String, String> handleValidationErrors(MethodArgumentNotValidException ex) {

        Map<String, String> errors = new HashMap<>();

        ex.getBindingResult()
                .getFieldErrors()
                .forEach(error -> errors.put(
                        error.getField(),
                        error.getDefaultMessage()
                ));

        log.atWarn()
                .addKeyValue(LoggingKeys.EVENT, "request_validation_failed")
                .addKeyValue("errorCount", errors.size())
                .addKeyValue("invalidFields", String.join(",", errors.keySet()))
                .log("Request argument validation failed");

        return errors;
    }

    /**
     * Collects the violations of request parameters checked through method validation. The method name that prefixes
     * each property path is dropped, so the response is keyed by the request parameter alone.
     *
     * @param ex exception raised when a controller parameter violates its constraint
     *
     * @return one entry per violated parameter, keyed by its name
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public Map<String, String> handleConstraintViolation(ConstraintViolationException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getConstraintViolations()
                .forEach(error -> errors.put(
                        parameterName(error.getPropertyPath().toString()),
                        error.getMessage()
                ));

        log.atWarn()
                .addKeyValue(LoggingKeys.EVENT, "request_validation_failed")
                .addKeyValue("errorCount", errors.size())
                .addKeyValue("invalidFields", String.join(",", errors.keySet()))
                .log("Request parameter validation failed");

        return errors;
    }

    /**
     * Extracts the request parameter name from a property path shaped as {@code methodName.parameterName} or
     * {@code methodName.parameterName.node}. Only the last segment is kept, so a violation reported on a nested node of
     * the parameter is still keyed by the request parameter the client has to correct.
     *
     * @param propertyPath property path reported by the constraint violation
     *
     * @return the text after the last dot, or the whole path when it has no dot
     */
    private static String parameterName(String propertyPath) {
        return propertyPath.substring(propertyPath.lastIndexOf('.') + 1);
    }
}
