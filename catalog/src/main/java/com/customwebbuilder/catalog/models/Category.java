package com.customwebbuilder.catalog.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Category a product can belong to.
 *
 * <p>The name is the natural key: it is unique, so a category can be resolved by name without carrying its identifier
 * through the request. The owning side of the relation is {@link Product}.
 */
@Getter
@Setter
@Entity
@NoArgsConstructor
@Table(name = "categories")
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @ManyToMany(mappedBy = "categories", fetch = FetchType.LAZY)
    private Set<Product> products = new HashSet<>();

    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID uuid;
}
