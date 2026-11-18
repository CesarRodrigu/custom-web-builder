package com.customwebbuilder.catalog.models.search;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

/**
 * OpenSearch representation of a product.
 *
 * <p>The index is created explicitly by the application so the mapping is stable, therefore {@code createIndex} is
 * disabled here. The identifier is stored in the source document as a keyword, which keeps sorting by {@code id}
 * deterministic. Free text fields keep a {@code keyword} sub-field for exact filters and ordering.
 */
@Getter
@Setter
@NoArgsConstructor
@Document(indexName = "products", createIndex = false, storeIdInSource = true)
public class ProductSearchDocument {

    /**
     * Name of the index that stores the product documents. It is also reported by the reindex endpoint, so the client
     * can name the index it has just rebuilt.
     */
    public static final String INDEX_NAME = "products";

    @Id
    @Field(type = FieldType.Keyword)
    private Long id;

    @MultiField(
            mainField = @Field(type = FieldType.Text),
            otherFields = @InnerField(suffix = "keyword", type = FieldType.Keyword)
    )
    private String name;

    @Field(type = FieldType.Text)
    private String description;

    @Field(type = FieldType.Keyword)
    private String sku;

    /**
     * Price of the product, stored in cents so the index keeps the two decimals of the money amounts. A scaling factor
     * of one would round 89.99 up to 90 and the slider bounds would not match the catalog.
     */
    @Field(type = FieldType.Scaled_Float, scalingFactor = 100)
    private BigDecimal price;

    /**
     * Reduced price of the product, stored in cents for the same reason as {@link #price}.
     */
    @Field(type = FieldType.Scaled_Float, scalingFactor = 100)
    private BigDecimal salePrice;

    @Field(type = FieldType.Integer)
    private Integer stockQuantity;

    @MultiField(
            mainField = @Field(type = FieldType.Text),
            otherFields = @InnerField(suffix = "keyword", type = FieldType.Keyword)
    )
    private String brand;

    @Field(type = FieldType.Object)
    private Set<CategorySearchDocument> categories = new HashSet<>();

    @Field(type = FieldType.Keyword, index = false)
    private String imageUrl;

    @Field(type = FieldType.Keyword, index = false)
    private Set<String> imageUrls = new HashSet<>();

    @Field(type = FieldType.Boolean)
    private Boolean active;

    @Field(type = FieldType.Date, format = DateFormat.date_optional_time)
    private Instant createdAt;

    @Field(type = FieldType.Date, format = DateFormat.date_optional_time)
    private Instant updatedAt;
}
