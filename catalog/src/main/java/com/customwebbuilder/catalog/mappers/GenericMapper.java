package com.customwebbuilder.catalog.mappers;

import java.util.List;

/**
 * Contract of the bidirectional mapper between an entity and its DTO.
 *
 * <p>MapStruct generates the implementation, so a mapper with a direct field-to-field correspondence only has to
 * extend this interface. A mapper that has to resolve entities, such as the product input mapper, extends it too and
 * keeps the lookups in protected methods so the generated code stays declarative.
 *
 * @param <E> entity type of the mapping
 * @param <D> DTO type of the mapping
 */
public interface GenericMapper<E, D> {

    /**
     * Converts one entity into its DTO.
     *
     * @param entity entity to convert
     *
     * @return the matching DTO
     */
    D toDTO(E entity);

    /**
     * Converts one DTO into a transient entity, ready to be persisted by a service.
     *
     * @param dto DTO to convert
     *
     * @return the matching entity
     */
    E toEntity(D dto);

    /**
     * Converts a list of entities into their DTOs, keeping the order of the source list.
     *
     * @param entities entities to convert
     *
     * @return the matching DTOs
     */
    List<D> toDTOs(List<E> entities);

    /**
     * Converts a list of DTOs into transient entities, keeping the order of the source list.
     *
     * @param dtos DTOs to convert
     *
     * @return the matching entities
     */
    List<E> toEntities(List<D> dtos);
}
