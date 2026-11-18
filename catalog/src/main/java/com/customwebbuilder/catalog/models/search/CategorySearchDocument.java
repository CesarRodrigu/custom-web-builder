package com.customwebbuilder.catalog.models.search;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

/**
 * Category embedded in the OpenSearch representation of a product.
 *
 * <p>The name is mapped as a keyword so products can be filtered by their exact category name.
 */
@Getter
@Setter
@NoArgsConstructor
public class CategorySearchDocument {

    @Field(type = FieldType.Long)
    private Long id;

    @Field(type = FieldType.Keyword)
    private String name;
}
