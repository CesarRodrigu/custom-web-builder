package com.customwebbuilder.catalog.models.search;

import org.junit.jupiter.api.Test;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests for the explicit mapping declared by {@link ProductSearchDocument}.
 */
class ProductSearchDocumentTest {

    private static final double MONEY_SCALING_FACTOR = 100;

    @Test
    void storesThePriceInCentsSoTheIndexKeepsTheTwoDecimals() throws NoSuchFieldException {
        assertMoneyField("price");
    }

    private static void assertMoneyField(String name) throws NoSuchFieldException {
        Field mapping = ProductSearchDocument.class.getDeclaredField(name).getAnnotation(Field.class);

        assertThat(mapping).isNotNull();
        assertThat(mapping.type()).isEqualTo(FieldType.Scaled_Float);
        assertThat(mapping.scalingFactor()).isEqualTo(MONEY_SCALING_FACTOR);
    }

    @Test
    void storesTheSalePriceInCentsSoTheIndexKeepsTheTwoDecimals() throws NoSuchFieldException {
        assertMoneyField("salePrice");
    }
}
