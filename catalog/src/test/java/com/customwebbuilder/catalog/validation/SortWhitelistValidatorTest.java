package com.customwebbuilder.catalog.validation;

import com.customwebbuilder.catalog.BaseTest;
import com.customwebbuilder.catalog.models.enums.ProductSortField;
import com.customwebbuilder.catalog.validation.validators.SortWhitelistValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.ConstraintValidatorContext.ConstraintViolationBuilder;
import jakarta.validation.ConstraintValidatorContext.ConstraintViolationBuilder.NodeBuilderCustomizableContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link SortWhitelistValidator}, covering the accepted pageables and the violation it reports when an
 * ordering field falls outside {@link ProductSortField}.
 */
@ExtendWith(MockitoExtension.class)
class SortWhitelistValidatorTest extends BaseTest {

    private final SortWhitelistValidator validator = new SortWhitelistValidator();

    @Mock
    private ConstraintValidatorContext context;

    @Mock
    private ConstraintViolationBuilder violationBuilder;

    @Mock
    private NodeBuilderCustomizableContext nodeBuilder;

    @BeforeEach
    void setUp() {
        lenient().when(context.buildConstraintViolationWithTemplate(anyString())).thenReturn(violationBuilder);
        lenient().when(violationBuilder.addPropertyNode(anyString())).thenReturn(nodeBuilder);
    }

    @Test
    void acceptsAMissingPageable() {
        assertThat(validator.isValid(null, context)).isTrue();
        verifyNoInteractions(context);
    }

    @Test
    void acceptsAPageableWithoutOrdering() {
        assertThat(validator.isValid(PageRequest.of(0, 20), context)).isTrue();
        verifyNoInteractions(context);
    }

    @Test
    void acceptsEveryPropertyOfTheWhitelist() {
        for (ProductSortField field : ProductSortField.values()) {
            Pageable pageable = PageRequest.of(0, 20, Sort.by(field.getProperty()));

            assertThat(validator.isValid(pageable, context)).isTrue();
        }

        verifyNoInteractions(context);
    }

    @Test
    void acceptsAMultiFieldOrderingWhenEveryPropertyIsSupported() {
        Pageable pageable = PageRequest.of(0, 20, Sort.by("price", "name"));

        assertThat(validator.isValid(pageable, context)).isTrue();
    }

    @Test
    void rejectsAPropertyOutsideTheWhitelistAndPointsAtTheSortParameter() {
        Pageable pageable = PageRequest.of(0, 20, Sort.by("unknown"));

        assertThat(validator.isValid(pageable, context)).isFalse();

        verify(context).disableDefaultConstraintViolation();
        verify(context).buildConstraintViolationWithTemplate("Unsupported sort field: unknown");
        verify(violationBuilder).addPropertyNode("sort");
        verify(nodeBuilder).addConstraintViolation();
    }

    @Test
    void rejectsAWhitelistedPropertyWrittenWithADifferentCase() {
        String upperCaseProperty = ProductSortField.NAME.getProperty().toUpperCase();

        assertThat(validator.isValid(PageRequest.of(0, 20, Sort.by(upperCaseProperty)), context)).isFalse();
    }
}
