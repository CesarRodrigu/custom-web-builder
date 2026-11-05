/**
 * Category field of a product page: the multi-select of category paths
 * rendered as removable chips, backed by a combobox that suggests the
 * category paths already used in the catalog and offers the typed path as
 * a creatable option when it is new.
 */
import { Badge } from "@/components/ui/badge";
import type { BuilderTexts } from "@/features/builder/builder-texts";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import type { ProductDraft } from "@/lib/catalog/schema";
import { useMemo, useState } from "react";

/** Props of the category field. */
interface CategoryFieldProps {
  /** Catalog position of the product being edited. */
  index: number;
  /** Product being edited. */
  product: ProductDraft;
  /** Category paths typed anywhere in the catalog, unique regardless of case and in first use order. */
  suggestions: string[];
  /**
   * Localized validation message of a field, or `undefined` while it is
   * valid; receives the dotted field path, like `products.0.categories.1`.
   */
  getError: (field: string) => string | undefined;
  /** Called with the full category list whenever the selection changes. */
  onValueChange: (categories: string[]) => void;
  /** Localized strings; the only difference between locales. */
  texts: BuilderTexts;
}

/**
 * Renders the category chips field of one product, including its combobox
 * popup and the validation messages of the selected paths.
 * @param props Field data, the category suggestions and its callbacks.
 * @returns The category field markup.
 */
export function CategoryField(props: Readonly<CategoryFieldProps>) {
  const { index, product, suggestions, getError, onValueChange, texts } = props;
  /** Anchor of the category chips row, so the popup anchors and sizes to it. */
  const chipsAnchor = useComboboxAnchor();
  const [categoryInput, setCategoryInput] = useState("");

  /**
   * The category path just typed whenever it does not match any suggestion
   * case-insensitively, so the combobox also offers it as a creatable
   * option; `undefined` while the typed path matches a suggestion.
   * @returns The creatable category path, or `undefined`.
   */
  const customCategoryPath = useMemo(() => {
    const typedPath = categoryInput.trim();
    const exists = suggestions.some(
      (suggestion) => suggestion.toLowerCase() === typedPath.toLowerCase(),
    );
    return typedPath !== "" && !exists ? typedPath : undefined;
  }, [categoryInput, suggestions]);

  /**
   * Items of the category combobox: the used category paths plus the typed
   * path as a creatable option when it is new.
   * @returns The item list of the category combobox.
   */
  const categoryItems = useMemo(
    () =>
      customCategoryPath === undefined
        ? suggestions
        : [...suggestions, customCategoryPath],
    [suggestions, customCategoryPath],
  );

  /**
   * Reports the localized validation message of one selected category path.
   * @param categoryIndex Position of the path within the product categories.
   * @returns The message for the path's issue, if any.
   */
  function categoryError(categoryIndex: number): string | undefined {
    return getError(`products.${index}.categories.${categoryIndex}`);
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">
        {texts.productCategoriesLabel}
      </legend>
      <Combobox
        multiple
        autoHighlight
        items={categoryItems}
        itemToStringValue={(path) => path}
        value={product.categories}
        onValueChange={(categories) => {
          onValueChange([...categories]);
          setCategoryInput("");
        }}
        inputValue={categoryInput}
        onInputValueChange={setCategoryInput}
      >
        <ComboboxValue>
          {(selectedPaths: string[]) => (
            <ComboboxChips ref={chipsAnchor}>
              {selectedPaths.map((path, categoryIndex) => (
                <ComboboxChip
                  key={`${path}-${categoryIndex}`}
                  render={<Badge variant="secondary" />}
                  aria-label={path}
                  aria-invalid={categoryError(categoryIndex) ? true : undefined}
                >
                  {path}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput
                aria-label={texts.productCategoryLabel}
                placeholder={texts.productCategoryPlaceholder}
              />
            </ComboboxChips>
          )}
        </ComboboxValue>
        <ComboboxContent anchor={chipsAnchor}>
          <ComboboxList>
            {categoryItems.map((path) => (
              <ComboboxItem key={path} value={path}>
                {path === customCategoryPath
                  ? `${texts.addCategory} «${path}»`
                  : path}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {product.categories.map((category, categoryIndex) => {
        const error = categoryError(categoryIndex);
        if (!error) return null;
        return (
          <p key={category} className="text-sm text-destructive">
            {error}
          </p>
        );
      })}
    </fieldset>
  );
}

export default CategoryField;
