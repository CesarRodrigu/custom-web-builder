package com.customwebbuilder.catalog.mappers;

import com.customwebbuilder.catalog.models.Product;
import com.customwebbuilder.catalog.models.dtos.output.ProductOutputDTO;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;


/**
 * Maps a product entity onto its public representation.
 *
 * <p>The correspondence is direct, so the generated implementation is enough and no lookup is needed.
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface ProductOutputMapper extends GenericMapper<Product, ProductOutputDTO> {
}