package com.customwebbuilder.catalog;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link GreetingService}.
 */
class GreetingServiceTest {

    private final GreetingService service = new GreetingService();

    @Test
    void greetWithName() {
        assertEquals("Hello, Ada!", service.greet("Ada"));
    }

    @Test
    void greetWithNull() {
        assertEquals("Hello, world!", service.greet(null));
    }

    @Test
    void greetWithBlank() {
        assertEquals("Hello, world!", service.greet("   "));
    }
}
