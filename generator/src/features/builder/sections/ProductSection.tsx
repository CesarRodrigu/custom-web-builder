/**
 * Product page of the editor: the fields of one catalog entry (name, price,
 * description, image URL and categories) plus the button that removes it.
 */
import CategoryField from "@/features/builder/fields/CategoryField";
import type { BuilderTexts } from "@/features/builder/builder-texts";
import { productInputId } from "@/features/builder/editor-section";
import BigTextField from "@/features/builder/fields/BigTextField";
import TextField from "@/features/builder/fields/TextField";
import RemoveProductButton from "@/features/builder/components/RemoveProductButton";
import { Button } from "@/components/ui/button";
import { ProductTextField, type ProductDraft } from "@/lib/catalog/schema";

/** Props of one product page. */
interface ProductSectionProps {
  /** Catalog position of the product being edited. */
  index: number;
  /** Product being edited. */
  product: ProductDraft;
  /** Category paths typed anywhere in the catalog, unique regardless of case and in first use order. */
  categorySuggestions: string[];
  /**
   * Localized validation message of a field, or `undefined` while it is
   * valid; receives the dotted field path, like `products.0.price`.
   */
  getError: (field: string) => string | undefined;
  /** Called with the field and its new value whenever the user types. */
  onChange: (field: ProductTextField, value: string) => void;
  /** Called with the full category list whenever the category selection changes. */
  onCategoriesChange: (categories: string[]) => void;
  /** Called when the user removes this product from the catalog. */
  onRemove: () => void;
  /** Localized strings; the only difference between locales. */
  texts: BuilderTexts;
}

/**
 * Renders one product page with its form fields and its category chips
 * field, using the product id as the heading number while the user has not
 * typed the product name yet.
 * @param props Page data, the product draft and its change callbacks.
 * @returns The page markup.
 */
export function ProductSection(props: Readonly<ProductSectionProps>) {
  const {
    index,
    product,
    categorySuggestions,
    getError,
    onChange,
    onCategoriesChange,
    onRemove,
    texts,
  } = props;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">
        {product.name.trim() || `${texts.unnamedProduct} ${product.id}`}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={productInputId(index, ProductTextField.Name)}
          label={texts.productNameLabel}
          placeholder={texts.productNamePlaceholder}
          description={texts.productNameHint}
          required
          value={product.name}
          errorText={getError(`products.${index}.${ProductTextField.Name}`)}
          onChange={(value) => onChange(ProductTextField.Name, value)}
        />
        <TextField
          id={productInputId(index, ProductTextField.Price)}
          label={texts.productPriceLabel}
          placeholder={texts.productPricePlaceholder}
          description={texts.productPriceHint}
          required
          value={product.price}
          errorText={getError(`products.${index}.${ProductTextField.Price}`)}
          onChange={(value) => onChange(ProductTextField.Price, value)}
        />
      </div>
      <TextField
        id={productInputId(index, ProductTextField.ImageUrl)}
        label={texts.productImageUrlLabel}
        placeholder={texts.productImageUrlPlaceholder}
        description={texts.productImageUrlHint}
        value={product.imageUrl}
        errorText={getError(`products.${index}.${ProductTextField.ImageUrl}`)}
        onChange={(value) => onChange(ProductTextField.ImageUrl, value)}
      />
      <CategoryField
        index={index}
        product={product}
        suggestions={categorySuggestions}
        getError={getError}
        onValueChange={onCategoriesChange}
        texts={texts}
      />
      <BigTextField
        id={productInputId(index, ProductTextField.Description)}
        label={texts.productDescriptionLabel}
        placeholder={texts.productDescriptionPlaceholder}
        description={texts.productDescriptionHint}
        value={product.description}
        errorText={getError(
          `products.${index}.${ProductTextField.Description}`,
        )}
        onChange={(value) => onChange(ProductTextField.Description, value)}
      />
      <div>
        <RemoveProductButton
          texts={texts}
          onRemove={onRemove}
          trigger={
            <Button type="button" variant="destructive" size="sm">
              {texts.removeProduct}
            </Button>
          }
        />
      </div>
    </section>
  );
}

export default ProductSection;
