/**
 * Product page of the editor: every field the product schema declares
 * (name, price, image, categories, short and long descriptions, stock, status
 * and gallery) plus the buttons that remove the entry and confirm it before
 * opening a new empty one.
 */
import CategoryField from "@/features/builder/fields/CategoryField";
import type { BuilderTexts } from "@/features/builder/builder-texts";
import { productInputId } from "@/features/builder/editor-section";
import BigTextField from "@/features/builder/fields/BigTextField";
import SelectField from "@/features/builder/fields/SelectField";
import SkuField from "@/features/builder/fields/SkuField";
import TextField from "@/features/builder/fields/TextField";
import RemoveProductButton from "@/features/builder/components/RemoveProductButton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  ProductEditorField,
  ProductStatus,
  toImageListInput,
  toPriceInput,
  toStockInput,
  type ProductDraft,
} from "@/lib/catalog/schema";

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
  onChange: (field: ProductEditorField, value: string) => void;
  /** Called with the full category list whenever the category selection changes. */
  onCategoriesChange: (categories: string[]) => void;
  /** Called when the user asks to rebuild the SKU from the current names. */
  onGenerateSku: () => void;
  /** Called when the user removes this product from the catalog. */
  onRemove: () => void;
  /** Called when the user confirms this product and asks for a new empty one. */
  onAddNext: () => void;
  /** Whether the last add attempt was blocked by issues in this product. */
  showAddError: boolean;
  /** Localized strings; the only difference between locales. */
  texts: BuilderTexts;
}

/**
 * Renders one product page with its form fields and its category chips
 * field, using the product id as the heading number while the user has not
 * typed the product name yet. The add control sits to the right of the remove
 * one and shows a message when a blocked attempt left this product unfinished.
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
    onGenerateSku,
    onRemove,
    onAddNext,
    showAddError,
    texts,
  } = props;
  const statusOptions = [
    { value: "", label: texts.productStatusNone },
    { value: ProductStatus.Recommended, label: texts.productStatusRecommended },
    { value: ProductStatus.NotForSale, label: texts.productStatusNotForSale },
  ];
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">
        {product.name.trim() || `${texts.unnamedProduct} ${product.id}`}
      </h2>
      <SkuField
        id={productInputId(index, ProductEditorField.Sku)}
        label={texts.productSkuLabel}
        generateLabel={texts.generateSku}
        placeholder={texts.productSkuPlaceholder}
        description={texts.productSkuHint}
        required
        value={product.sku ?? ""}
        errorText={getError(`products.${index}.${ProductEditorField.Sku}`)}
        onChange={(value) => onChange(ProductEditorField.Sku, value)}
        onGenerate={onGenerateSku}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={productInputId(index, ProductEditorField.Name)}
          label={texts.productNameLabel}
          placeholder={texts.productNamePlaceholder}
          description={texts.productNameHint}
          required
          value={product.name}
          errorText={getError(`products.${index}.${ProductEditorField.Name}`)}
          onChange={(value) => onChange(ProductEditorField.Name, value)}
        />
        <TextField
          id={productInputId(index, ProductEditorField.Price)}
          label={texts.productPriceLabel}
          placeholder={texts.productPricePlaceholder}
          description={texts.productPriceHint}
          required
          value={toPriceInput(product.price)}
          errorText={getError(`products.${index}.${ProductEditorField.Price}`)}
          onChange={(value) => onChange(ProductEditorField.Price, value)}
        />
      </div>
      <TextField
        id={productInputId(index, ProductEditorField.MainImage)}
        label={texts.productMainImageLabel}
        placeholder={texts.productMainImagePlaceholder}
        description={texts.productMainImageHint}
        value={product.mainImage}
        errorText={getError(
          `products.${index}.${ProductEditorField.MainImage}`,
        )}
        onChange={(value) => onChange(ProductEditorField.MainImage, value)}
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
        id={productInputId(index, ProductEditorField.ShortDescription)}
        label={texts.productDescriptionLabel}
        placeholder={texts.productDescriptionPlaceholder}
        description={texts.productDescriptionHint}
        required
        value={product.shortDescription ?? ""}
        errorText={getError(
          `products.${index}.${ProductEditorField.ShortDescription}`,
        )}
        onChange={(value) =>
          onChange(ProductEditorField.ShortDescription, value)
        }
      />
      <BigTextField
        id={productInputId(index, ProductEditorField.LongDescription)}
        label={texts.productLongDescriptionLabel}
        placeholder={texts.productLongDescriptionPlaceholder}
        description={texts.productLongDescriptionHint}
        value={product.longDescription ?? ""}
        onChange={(value) =>
          onChange(ProductEditorField.LongDescription, value)
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={productInputId(index, ProductEditorField.Stock)}
          label={texts.productStockLabel}
          placeholder={texts.productStockPlaceholder}
          description={texts.productStockHint}
          value={toStockInput(product.stock)}
          errorText={getError(`products.${index}.${ProductEditorField.Stock}`)}
          onChange={(value) => onChange(ProductEditorField.Stock, value)}
        />
        <SelectField
          id={productInputId(index, ProductEditorField.Status)}
          label={texts.productStatusLabel}
          options={statusOptions}
          description={texts.productStatusHint}
          value={product.status ?? ""}
          onChange={(value) => onChange(ProductEditorField.Status, value)}
        />
      </div>
      <BigTextField
        id={productInputId(index, ProductEditorField.Images)}
        label={texts.productImagesLabel}
        placeholder={texts.productImagesPlaceholder}
        description={texts.productImagesHint}
        value={toImageListInput(product.images)}
        onChange={(value) => onChange(ProductEditorField.Images, value)}
      />
      <div className="flex items-center justify-between gap-2">
        <RemoveProductButton
          texts={texts}
          onRemove={onRemove}
          trigger={
            <Button type="button" variant="destructive" size="sm">
              {texts.removeProduct}
            </Button>
          }
        />
        <div className="flex flex-col items-end gap-1">
          <Button type="button" size="sm" onClick={onAddNext}>
            <Plus />
            {texts.addNextProduct}
          </Button>
          {showAddError && (
            <p className="text-sm text-destructive">
              {texts.addNextProductError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default ProductSection;
