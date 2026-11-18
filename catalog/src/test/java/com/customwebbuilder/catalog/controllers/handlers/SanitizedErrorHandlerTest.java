package com.customwebbuilder.catalog.controllers.handlers;

import com.customwebbuilder.catalog.BaseTest;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Registration rule of {@link SanitizedErrorHandler}: the advice hides internal detail everywhere except in the
 * {@code dev} profile, where that detail is what helps to debug a failure.
 */
class SanitizedErrorHandlerTest extends BaseTest {

    @Test
    void loadsWhenTheDevProfileIsNotActive() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.register(SanitizedErrorHandler.class);
            context.refresh();

            assertThat(context.getBeanNamesForType(SanitizedErrorHandler.class)).hasSize(1);
        }
    }

    @Test
    void doesNotLoadWhenTheDevProfileIsActive() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.getEnvironment().setActiveProfiles("dev");
            context.register(SanitizedErrorHandler.class);
            context.refresh();

            assertThat(context.getBeanNamesForType(SanitizedErrorHandler.class)).isEmpty();
        }
    }
}
