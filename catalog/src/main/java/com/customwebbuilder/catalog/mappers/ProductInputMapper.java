package com.customwebbuilder.catalog.mappers;

import com.customwebbuilder.catalog.models.Category;
import com.customwebbuilder.catalog.models.Product;
import com.customwebbuilder.catalog.models.dtos.input.ProductInputDTO;
import com.customwebbuilder.catalog.repositories.CategoryRepository;
import jakarta.persistence.EntityNotFoundException;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.springframework.beans.factory.annotation.Autowired;


/**
 * Maps the payload of the relational product endpoint onto the product entity.
 *
 * <p>The categories travel as identifiers, so the mapper resolves each one against the database instead of trusting
 * the request. It is an abstract class rather than an interface because MapStruct needs to inject the repository that
 * performs that lookup.
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public abstract class ProductInputMapper
        implements GenericMapper<Product, ProductInputDTO> {

    @Autowired
    private CategoryRepository categoryRepository;


    protected Category map(Long categoryId) {
        if (categoryId == null) {
            return null;
        }

        return categoryRepository.findById(categoryId)
                .orElseThrow(() ->
                        new EntityNotFoundException(
                                "Category not found with id: " + categoryId
                        )
                );
    }

    /**
     * Reverse mapping required by {@code toDto}: turns each category entity back into the id carried by
     * {@code ProductInputDTO.categories}.
     *
     * @param category category entity to convert, may be null
     *
     * @return the category id, or null when the category is null
     */
    protected Long map(Category category) {
        if (category == null) {
            return null;
        }

        return category.getId();
    }
}