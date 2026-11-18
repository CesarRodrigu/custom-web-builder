package com.customwebbuilder.catalog.controllers.handlers;

import com.customwebbuilder.catalog.logging.LoggingKeys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponse;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Keeps the internal detail of a failure out of the response without changing the status the failure declares.
 *
 * <p>Two handlers share the rule: one for the exceptions that carry a status of their own, such as
 * {@link org.springframework.web.server.ResponseStatusException}, and one for the rest. The status survives, the reason
 * does not: the body carries the standard text of the status while the original exception and its values stay in the
 * log. The advice is inactive while the {@code dev} profile is active and runs after every advice that translates a
 * known exception, so the specific handlers keep the failures they understand.
 */
@Slf4j
@RestControllerAdvice
@Profile("!dev")
@Order(Ordered.LOWEST_PRECEDENCE)
public class SanitizedErrorHandler {

    /**
     * Hides the reason of an exception that already declares the status of the response.
     *
     * @param ex exception with the status of the failure and a reason meant for whoever debugs the service
     *
     * @return the status of the exception with a body that holds only the standard text of that status
     */
    @ExceptionHandler(ErrorResponseException.class)
    public ResponseEntity<Map<String, String>> handleErrorResponse(ErrorResponseException ex) {

        return sanitized(ex, ex.getStatusCode());
    }

    /**
     * Builds the response shared by both handlers and records the exception that carried the original detail.
     *
     * @param ex     exception whose detail stays out of the response
     * @param status status the response keeps
     *
     * @return the status with the standard text of that status in the body
     */
    private ResponseEntity<Map<String, String>> sanitized(Exception ex, HttpStatusCode status) {

        if (status.is5xxServerError()) {
            log.atError()
                    .addKeyValue(LoggingKeys.EVENT, "error_sanitized")
                    .addKeyValue("status", status.value())
                    .setCause(ex)
                    .log("Replaced the detail of a server error response");
        } else {
            log.atWarn()
                    .addKeyValue(LoggingKeys.EVENT, "error_sanitized")
                    .addKeyValue("status", status.value())
                    .log("Replaced the detail of a client error response");
        }

        return ResponseEntity.status(status).body(Map.of("error", reasonPhrase(status)));
    }

    /**
     * Returns the standard text of the status, the only description of the failure that reaches the client.
     *
     * @param status status carried by the exception
     *
     * @return the reason phrase of the status, or a generic text for a code outside the standard list
     */
    private static String reasonPhrase(HttpStatusCode status) {

        HttpStatus resolved = HttpStatus.resolve(status.value());

        return resolved != null ? resolved.getReasonPhrase() : "Request failed";
    }

    /**
     * Hides the detail of any other failure.
     *
     * <p>Framework exceptions implement {@link ErrorResponse} to declare the status they deserve, so a malformed
     * request still answers {@code 400} and an unknown route still answers {@code 404}. An exception without a status
     * of its own is a server failure and answers {@code 500}.
     *
     * @param ex exception raised while serving the request
     *
     * @return the declared status, or {@code 500} when the exception declares none
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleUnexpectedException(Exception ex) {

        HttpStatusCode status = ex instanceof ErrorResponse errorResponse
                ? errorResponse.getStatusCode()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        return sanitized(ex, status);
    }
}
