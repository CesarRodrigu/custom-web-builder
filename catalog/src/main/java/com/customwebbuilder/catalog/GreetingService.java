package com.customwebbuilder.catalog;

import org.springframework.stereotype.Service;

/**
 * Simple greeting service used as a sample for tests and SonarQube coverage.
 */
@Service
public class GreetingService {

    /**
     * Builds a greeting message for the given name.
     *
     * @param name the name to greet; may be {@code null} or blank
     * @return a greeting message
     */
    public String greet(String name) {
        if (name == null || name.isBlank()) {
            return "Hello, world!";
        }
        return "Hello, " + name + "!";
    }
}
