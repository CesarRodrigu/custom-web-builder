package com.customwebbuilder.catalog;

/**
 * Base class for every test of the service.
 *
 * <p>It marks the test classes of the project. The parallel execution is configured in
 * {@code src/test/resources/junit-platform.properties}: classes run concurrently and the methods of a class run in the
 * same thread, so a test that shares a Spring context with another class does not race against it over its mock beans.
 */
public abstract class BaseTest {
}
