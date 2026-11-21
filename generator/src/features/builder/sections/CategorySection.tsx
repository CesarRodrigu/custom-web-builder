/**
 * Category page of the editor: the editable name and description of one
 * category, the products that currently belong to it with an action to remove
 * each one, and the buttons that delete the category or confirm it and open a
 * new empty one.
 */
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import RemoveCategoryButton from "@/features/builder/components/RemoveCategoryButton";
import type { BuilderTexts } from "@/features/builder/builder-texts";
import { categoryInputId } from "@/features/builder/editor-section";
import BigTextField from "@/features/builder/fields/BigTextField";
import TextField from "@/features/builder/fields/TextField";
import { CategoryEditorField, type CategoryDraft } from "@/lib/catalog/schema";

/** One product listed on a category page. */
export interface CategoryProductItem {
  /** Position of the product within the catalog. */
  index: number;
  /** Display name of the product. */
  name: string;
}

/** Props of one category page. */
interface CategorySectionProps {
  /** Position of the category being edited. */
  index: number;
  /** Category being edited. */
  category: CategoryDraft;
  /** Products whose category list includes this category, in catalog order. */
  products: readonly CategoryProductItem[];
  /**
   * Localized validation message of a field, or `undefined` while it is
   * valid; receives the dotted field path, like `categories.0.name`.
   */
  getError: (field: string) => string | undefined;
  /** Called with the field and its new value whenever the user types. */
  onChange: (field: CategoryEditorField, value: string) => void;
  /** Called when one product is removed from this category. */
  onRemoveProduct: (productIndex: number) => void;
  /** Called when the user removes this category from the catalog. */
  onRemove: () => void;
  /** Called when the user confirms this category and asks for a new empty one. */
  onAddNext: () => void;
  /** Whether the last add attempt was blocked by issues in this category. */
  showAddError: boolean;
  /** Localized strings; the only difference between locales. */
  texts: BuilderTexts;
}

/**
 * Renders one category page with its name and description fields and the list
 * of related products, using the category id as the heading number while the
 * user has not typed the name yet.
 * @param props Page data, the category draft and its change callbacks.
 * @returns The page markup.
 */
export function CategorySection(props: Readonly<CategorySectionProps>) {
  const {
    index,
    category,
    products,
    getError,
    onChange,
    onRemoveProduct,
    onRemove,
    onAddNext,
    showAddError,
    texts,
  } = props;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">
        {category.name.trim() || `${texts.unnamedCategory} ${category.id}`}
      </h2>
      <TextField
        id={categoryInputId(index, CategoryEditorField.Name)}
        label={texts.categoryNameLabel}
        placeholder={texts.categoryNamePlaceholder}
        description={texts.categoryNameHint}
        required
        value={category.name}
        errorText={getError(`categories.${index}.${CategoryEditorField.Name}`)}
        onChange={(value) => onChange(CategoryEditorField.Name, value)}
      />
      <BigTextField
        id={categoryInputId(index, CategoryEditorField.Description)}
        label={texts.categoryDescriptionLabel}
        placeholder={texts.categoryDescriptionPlaceholder}
        description={texts.categoryDescriptionHint}
        value={category.description}
        errorText={getError(
          `categories.${index}.${CategoryEditorField.Description}`,
        )}
        onChange={(value) => onChange(CategoryEditorField.Description, value)}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">
          {texts.categoryProductsLabel}
        </legend>
        <p className="text-xs text-muted-foreground">
          {texts.categoryProductsHint}
        </p>
        {products.length === 0 ? (
          <Empty className="border">
            <EmptyDescription>{texts.categoryProductsEmpty}</EmptyDescription>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-1">
            {products.map((product) => (
              <li
                key={product.index}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <span>{product.name.trim() || texts.unnamedProduct}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`${texts.removeProductFromCategory}: ${product.name}`}
                  onClick={() => onRemoveProduct(product.index)}
                >
                  <X />
                  {texts.removeProductFromCategory}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      <div className="flex items-center justify-between gap-2">
        <RemoveCategoryButton
          texts={texts}
          onRemove={onRemove}
          trigger={
            <Button type="button" variant="destructive" size="sm">
              {texts.removeCategory}
            </Button>
          }
        />
        <div className="flex flex-col items-end gap-1">
          <Button type="button" size="sm" onClick={onAddNext}>
            {texts.addNextCategory}
          </Button>
          {showAddError && (
            <p className="text-sm text-destructive">
              {texts.addNextCategoryError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default CategorySection;
