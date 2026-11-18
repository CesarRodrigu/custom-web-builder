package com.customwebbuilder.catalog.validation;

import com.customwebbuilder.catalog.BaseTest;
import com.customwebbuilder.catalog.services.CategoryService;
import com.customwebbuilder.catalog.validation.validators.CategoryValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ValidCategory} through {@link CategoryValidator}, covering the accepted identifier of a stored
 * category and the rejection of an identifier that no row owns, including the message it reports.
 */
@ExtendWith(MockitoExtension.class)
class CategoryValidatorTest extends BaseTest {

    @Mock
    private CategoryService categoryService;

    @Mock
    private ConstraintValidatorContext context;

    @InjectMocks
    private CategoryValidator validator;

    @Test
    void acceptsTheIdentifierOfAStoredCategory() {
        when(categoryService.existsById(1L)).thenReturn(true);

        assertThat(validator.isValid(1L, context)).isTrue();
        verifyNoInteractions(context);
    }

    @Test
    void rejectsAnIdentifierThatNoCategoryOwns() {
        ConstraintValidatorContext.ConstraintViolationBuilder builder =
                mock(ConstraintValidatorContext.ConstraintViolationBuilder.class);
        when(categoryService.existsById(99L)).thenReturn(false);
        when(context.buildConstraintViolationWithTemplate("Category 99 not valid")).thenReturn(builder);

        assertThat(validator.isValid(99L, context)).isFalse();
        verify(context).disableDefaultConstraintViolation();
        verify(context).buildConstraintViolationWithTemplate("Category 99 not valid");
        verify(builder).addConstraintViolation();
    }
}
