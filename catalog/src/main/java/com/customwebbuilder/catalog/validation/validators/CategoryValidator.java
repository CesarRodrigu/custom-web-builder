package com.customwebbuilder.catalog.validation.validators;

import com.customwebbuilder.catalog.services.CategoryService;
import com.customwebbuilder.catalog.validation.ValidCategory;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class CategoryValidator implements ConstraintValidator<ValidCategory, Long> {
    private final CategoryService categoryService;

    @Override
    public boolean isValid(Long categoryId, ConstraintValidatorContext context) {
        boolean exists = categoryService.existsById(categoryId);

        if (!exists) {
            context.disableDefaultConstraintViolation();

            context.buildConstraintViolationWithTemplate(
                    "Category " + categoryId + " not valid"
            ).addConstraintViolation();

        }
        return exists;
    }
}
