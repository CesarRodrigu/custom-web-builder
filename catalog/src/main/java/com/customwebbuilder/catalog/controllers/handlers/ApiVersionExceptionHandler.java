package com.customwebbuilder.catalog.controllers.handlers;

import com.customwebbuilder.catalog.logging.LoggingKeys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.web.accept.InvalidApiVersionException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Translates a request for an API version that the application does not serve into a {@code 400 Bad Request} response
 * whose body names the rejected version.
 *
 * <p>The exception is a {@link org.springframework.web.server.ResponseStatusException}, so without the advice Spring
 * would render it as an RFC 9457 problem detail. The body below keeps the {@code field → message} contract the other
 * request rejections use, so a client checks every {@code 400} the same way.
 */
@Slf4j
@RestControllerAdvice
@ResponseStatus(HttpStatus.BAD_REQUEST)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ApiVersionExceptionHandler {

    /**
     * Reports the version that could not be served so the client corrects the path segment of the request.
     *
     * @param ex exception raised when the requested version is malformed or outside the supported set
     *
     * @return one entry keyed by {@code version} with the rejection message
     */
    @ExceptionHandler(InvalidApiVersionException.class)
    public Map<String, String> handleInvalidApiVersion(InvalidApiVersionException ex) {
        log.atWarn()
                .addKeyValue(LoggingKeys.EVENT, "api_version_rejected")
                .addKeyValue("requestedVersion", ex.getVersion())
                .log("Requested an API version that is not supported");

        return Map.of("version", "Invalid API version: '" + ex.getVersion() + "'.");
    }
}
