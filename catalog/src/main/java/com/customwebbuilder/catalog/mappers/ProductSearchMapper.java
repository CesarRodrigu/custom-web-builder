package com.customwebbuilder.catalog.mappers;

import com.customwebbuilder.catalog.models.Category;
import com.customwebbuilder.catalog.models.Product;
import com.customwebbuilder.catalog.models.dtos.input.ProductSearchInputDTO;
import com.customwebbuilder.catalog.models.dtos.output.ProductOutputDTO;
import com.customwebbuilder.catalog.models.search.CategorySearchDocument;
import com.customwebbuilder.catalog.models.search.ProductSearchDocument;
import com.customwebbuilder.catalog.repositories.CategoryRepository;
import jakarta.persistence.EntityNotFoundException;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

/**
 * Maps between the relational product model, the OpenSearch document and the request and response DTOs used by the
 * product search API.
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public abstract class ProductSearchMapper {

    @Autowired
    private CategoryRepository categoryRepository;

    /**
     * Builds the OpenSearch document of a persisted product.
     *
     * @param product product to convert, may be null
     *
     * @return the search document, or null when the product is null
     */
    public abstract ProductSearchDocument toDocument(Product product);

    /**
     * Builds the OpenSearch documents of the given products.
     *
     * @param products products to convert, may be null
     *
     * @return the search documents keeping the order of the source list, or null when the list is null
     */
    public abstract List<ProductSearchDocument> toDocuments(List<Product> products);

    /**
     * Builds a transient product from the complete payload accepted by the search endpoints.
     *
     * @param dto product payload to convert, may be null
     *
     * @return a new product whose categories are resolved from their identifiers, or null when the DTO is null
     */
    public abstract Product toEntity(ProductSearchInputDTO dto);

    /**
     * Builds the public representation of a search document.
     *
     * @param document search document to convert, may be null
     *
     * @return the response DTO, or null when the document is null
     */
    public abstract ProductOutputDTO toOutputDto(ProductSearchDocument document);

    /**
     * Builds the public representation of the given search documents.
     *
     * @param documents search documents to convert, may be null
     *
     * @return the response DTOs keeping the order of the source list, or null when the list is null
     */
    public abstract List<ProductOutputDTO> toOutputDtos(List<ProductSearchDocument> documents);

    /**
     * Resolves a category identifier into its persisted entity.
     *
     * @param categoryId identifier received in the request payload, may be null
     *
     * @return the matching category, or null when the identifier is null
     *
     * @throws EntityNotFoundException when no category uses the given identifier
     */
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
     * Builds the embedded representation of a category.
     *
     * @param category category to convert, may be null
     *
     * @return the embedded category, or null when the category is null
     */
    protected CategorySearchDocument map(Category category) {
        if (category == null) {
            return null;
        }

        CategorySearchDocument document = new CategorySearchDocument();
        document.setId(category.getId());
        document.setName(category.getName());
        return document;
    }
}
