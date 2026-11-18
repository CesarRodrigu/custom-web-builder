package com.customwebbuilder.catalog.models;


import com.customwebbuilder.catalog.validation.ValidImagePathOrUrl;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

/**
 * Product of the catalog.
 *
 * <p>It is the relational source of truth: every write is persisted here first and mirrored into the OpenSearch
 * document afterwards. The {@code sku} is the natural key used by the idempotent seeding, and the constraints are
 * declared twice on purpose, as Bean Validation annotations and as column definitions, so an invalid payload is
 * rejected before the database is reached.
 */
@Setter
@Getter
@Entity
@Table(name = "products")
@RequiredArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 150)
    @Column(nullable = false, length = 150)
    private String name;

    @Size(max = 2000)
    @Column(length = 2000)
    private String description;

    @NotBlank
    @Size(max = 50)
    @Column(nullable = false, unique = true, length = 50)
    private String sku;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = false)
    @Digits(integer = 10, fraction = 2)
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @DecimalMin(value = "0.0")
    @Digits(integer = 10, fraction = 2)
    @Column(precision = 12, scale = 2)
    private BigDecimal salePrice;

    @NotNull
    @Min(0)
    @Column(nullable = false)
    private Integer stockQuantity;

    @Size(max = 100)
    private String brand;

    @ManyToMany
    @JoinTable(
            name = "product_categories",
            joinColumns = @JoinColumn(name = "product_id"),
            inverseJoinColumns = @JoinColumn(name = "category_id")
    )
    private Set<Category> categories = new HashSet<>();

    @Size(max = 500)
    @ValidImagePathOrUrl
    private String imageUrl;

    /**
     * Gallery of image links; {@link #imageUrl} stays as the main image of the product.
     */
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "product_image_urls", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "image_url", length = 500)
    @Size(max = 10)
    private Set<@Size(max = 500) @ValidImagePathOrUrl String> imageUrls = new HashSet<>();

    @Column(nullable = false)
    private Boolean active = true;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;
}




