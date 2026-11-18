package com.customwebbuilder.catalog.test;

import com.customwebbuilder.catalog.BaseTest;
import org.junit.jupiter.api.Test;

class TestB extends BaseTest {

    @Test
    void test1() throws InterruptedException {
        exec("TestA - test1", 4000);
    }

    private void exec(String nombre, long time) throws InterruptedException {
        System.out.println(
                nombre + " START - " + Thread.currentThread().getName()
        );

        Thread.sleep(time);

        System.out.println(nombre + " END");
    }

    @Test
    void test2() throws InterruptedException {
        exec("TestA - test2", 3000);
    }
}