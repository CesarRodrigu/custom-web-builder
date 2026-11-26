/**
 * Validation and normalization of the site configuration.
 *
 * Every type, schema and validation code is defined once in the shared
 * workspace package; this module keeps only the behaviour that turns a draft
 * into a normalized configuration, so adding a field to the shared model
 * reaches the editor and the exported package without a second definition.
 */
import { toSlug } from "@custom-web-builder/shared/web-metadata";
import {
  ProductStatus,
  ProductTextField,
  ValidationCode,
  siteConfigDraftSchema,
  toValidationCode,
  type FieldIssue,
  type ProductDraft,
  type SiteConfigDraft,
  type SiteConfigValidation,
} from "@custom-web-builder/shared/catalog-schema";
import type { CategoryDraft } from "@custom-web-builder/shared/catalog-schema";

export {
  IMAGE_URL_PATTERN,
  PRICE_PATTERN,
  ProductStatus,
  ProductTextField,
  SiteTextField,
  ValidationCode,
  productSchema,
  siteConfigDraftSchema,
  siteMetaSchema,
  storedDraftSchema,
  DRAFT_STORAGE_KEY,
  SKU_PATTERN,
  isValidSku,
  toValidationCode,
  isEmptyOr,
  isFilled,
  isValidCategoryName,
  isValidFolderPath,
  matches,
  categoryDraftSchema,
  categoryJsonSchema,
  categorySchema,
  productDraftSchema,
  productJsonSchema,
  siteJsonSchema,
  type Category,
  type CategoryDocument,
  type CategoryDraft,
  type FieldIssue,
  type Product,
  type ProductDraft,
  type SiteConfig,
  type SiteConfigDraft,
  type SiteConfigValidation,
  type SiteMeta,
  type StoredDraft,
} from "@custom-web-builder/shared/catalog-schema";

/**
 * Product fields the editor exposes as an input.
 *
 * It reuses the plain text fields declared by the shared contract and adds the
 * fields the current product schema declares beyond them. The enumeration lives
 * here because the shared package owns the product contract, not the controls
 * that edit it.
 */
export const ProductEditorField = {
  ...ProductTextField,
  /** Short free text shown under the product name. */
  ShortDescription: "shortDescription",
  /** Long free text shown only on the detail page. */
  LongDescription: "longDescription",
  /** Units available in stock. */
  Stock: "stock",
  /** Highlight or availability status. */
  Status: "status",
  /** Gallery image references, one per line in the editor. */
  Images: "images",
} as const satisfies Record<string, keyof ProductDraft>;

/** Product field the editor edits with one control. */
export type ProductEditorField =
  (typeof ProductEditorField)[keyof typeof ProductEditorField];

/**
 * Builds the duplicate name issues of the catalog: one per product whose
 * trimmed name matches another product's trimmed name, ignoring case, so a
 * renamed-but-equal pair is caught as well.
 *
 * Blank names are skipped: they already raise their own `required` issue and
 * two placeholder rows are not a real rename collision.
 * @param draft Raw configuration whose product names are compared.
 * @returns One issue per duplicated product, in catalog order.
 */
export function toDuplicateNameIssues(draft: SiteConfigDraft): FieldIssue[] {
  const nameCounts = new Map<string, number>();
  for (const product of draft.products) {
    const name = product.name.trim().toLowerCase();
    if (name === "") continue;
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }
  return draft.products.flatMap((product, index) => {
    const name = product.name.trim().toLowerCase();
    if (name === "" || (nameCounts.get(name) ?? 0) <= 1) return [];
    return [
      { field: `products.${index}.name`, code: ValidationCode.Duplicate },
    ];
  });
}

/**
 * Builds the id of the next product to append: one above the highest id
 * already in the catalog, so ids grow monotonically and are never reused
 * after a deletion.
 * @param products Current products of the draft.
 * @returns The next free product id; `1` for an empty catalog.
 */
export function nextProductId(products: ProductDraft[]): number {
  return products.reduce((max, product) => Math.max(max, product.id), 0) + 1;
}

/**
 * Builds the id of the next category to append: one above the highest id
 * already in the catalog, so ids grow monotonically and are never reused
 * after a deletion.
 * @param categories Current categories of the draft.
 * @returns The next free category id; `1` for an empty catalog.
 */
export function nextCategoryId(categories: readonly CategoryDraft[]): number {
  return (
    categories.reduce((max, category) => Math.max(max, category.id), 0) + 1
  );
}

/**
 * Category fields the editor exposes as an input.
 */
export const CategoryEditorField = {
  /** Display name of the category. */
  Name: "name",
  /** Free text shown under the category name. */
  Description: "description",
} as const satisfies Record<string, keyof CategoryDraft>;

/** Category field the editor edits with one control. */
export type CategoryEditorField =
  (typeof CategoryEditorField)[keyof typeof CategoryEditorField];

/**
 * Adds one category row for every category name used by a product that the
 * catalog does not declare yet. The name is matched case-insensitively and
 * keeps the first spelling used by the products, the same rule the exporter
 * applies, so a category typed in a product page immediately becomes editable
 * in its own page with a description.
 * @param draft Current configuration draft.
 * @returns The draft with the missing category rows appended, in first use order.
 */
export function withCompleteCategories(
  draft: SiteConfigDraft,
): SiteConfigDraft {
  const result = [...draft.categories];
  const usedNames = new Map<string, string>();
  for (const product of draft.products) {
    for (const name of product.categories) {
      const trimmed = name.trim();
      const key = trimmed.toLowerCase();
      if (trimmed !== "" && !usedNames.has(key)) usedNames.set(key, trimmed);
    }
  }
  for (const name of usedNames.values()) {
    if (
      result.some(
        (category) => category.name.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      continue;
    }
    result.push({ id: nextCategoryId(result), name, description: "" });
  }
  return { ...draft, categories: result };
}

/**
 * Replaces one category name in every product that declares it. The comparison
 * ignores case so a purely lexical rename also updates the membership, while
 * a blank new name leaves the products untouched and lets the schema report
 * the category as required.
 * @param products Current products of the draft.
 * @param previousName Name the products currently declare.
 * @param nextName New name typed by the user.
 * @returns The products with their category names updated.
 */
export function renameCategoryInProducts(
  products: readonly ProductDraft[],
  previousName: string,
  nextName: string,
): ProductDraft[] {
  const previous = previousName.trim().toLowerCase();
  const next = nextName.trim();
  if (previous === "" || next === "") return [...products];
  return products.map((product) => ({
    ...product,
    categories: product.categories.map((name) =>
      name.trim().toLowerCase() === previous ? next : name,
    ),
  }));
}

/**
 * Removes one category name from every product that declares it. Used when a
 * category is deleted, so no product keeps a reference to a category that no
 * longer exists in the catalog.
 * @param products Current products of the draft.
 * @param categoryName Name of the category being deleted.
 * @returns The products without that category in their lists.
 */
export function removeCategoryFromProducts(
  products: readonly ProductDraft[],
  categoryName: string,
): ProductDraft[] {
  const removed = categoryName.trim().toLowerCase();
  return products.map((product) => ({
    ...product,
    categories: product.categories.filter(
      (name) => name.trim().toLowerCase() !== removed,
    ),
  }));
}

/**
 * Removes one category name from a single product. This is the action behind
 * the "remove product from category" control of a category page: the product
 * stays in the catalog and only loses its membership.
 * @param products Current products of the draft.
 * @param productIndex Position of the product being updated.
 * @param categoryName Name of the category losing the product.
 * @returns The products with that membership removed.
 */
export function removeProductFromCategory(
  products: readonly ProductDraft[],
  productIndex: number,
  categoryName: string,
): ProductDraft[] {
  return products.map((product, index) =>
    index === productIndex
      ? {
          ...product,
          categories: product.categories.filter(
            (name) =>
              name.trim().toLowerCase() !== categoryName.trim().toLowerCase(),
          ),
        }
      : product,
  );
}

/**
 * Normalizes the SKU typed in the editor: it trims the value, uppercases the
 * letters and turns runs of whitespace into hyphens. Characters outside the
 * SKU format are left untouched so the schema can report them.
 * @param value Raw text typed in the SKU input.
 * @returns The normalized SKU held by the draft.
 */
export function toSkuValue(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "-");
}

/**
 * Builds the default SKU of one product from the data the user entered. The
 * shape is `<BUSINESS>-<PRODUCT>-<SEQUENCE>`: the first slugged word of the
 * site name, the slugged product name, and the lowest three digit sequence
 * that is still unused in the catalog. Missing names fall back to `SKU` and
 * `ITEM`, so a product added before its name is typed still gets a code.
 * @param siteName Display name of the site being configured.
 * @param productName Display name of the product being added.
 * @param takenSkus SKUs already assigned to other products of the catalog.
 * @returns A SKU unique among the taken ones.
 */
export function buildDefaultSku(
  siteName: string,
  productName: string,
  takenSkus: Iterable<string>,
): string {
  const taken = new Set([...takenSkus].map((sku) => sku.trim().toUpperCase()));
  const business = toSlug(siteName).split("-")[0]?.toUpperCase() || "SKU";
  const product = toSlug(productName).toUpperCase() || "ITEM";
  let sequence = 1;
  let sku = `${business}-${product}-${String(sequence).padStart(3, "0")}`;
  while (taken.has(sku)) {
    sequence += 1;
    sku = `${business}-${product}-${String(sequence).padStart(3, "0")}`;
  }
  return sku;
}

/**
 * Builds one duplicate SKU issue per product whose normalized SKU matches
 * another product's, ignoring case. Blank SKUs are skipped because the schema
 * already reports them as required.
 * @param draft Raw configuration whose product SKUs are compared.
 * @returns One issue per duplicated product, in catalog order.
 */
export function toDuplicateSkuIssues(draft: SiteConfigDraft): FieldIssue[] {
  const skuCounts = new Map<string, number>();
  for (const product of draft.products) {
    const sku = product.sku?.trim().toUpperCase() ?? "";
    if (sku === "") continue;
    skuCounts.set(sku, (skuCounts.get(sku) ?? 0) + 1);
  }
  return draft.products.flatMap((product, index) => {
    const sku = product.sku?.trim().toUpperCase() ?? "";
    if (sku === "" || (skuCounts.get(sku) ?? 0) <= 1) return [];
    return [
      { field: `products.${index}.sku`, code: ValidationCode.DuplicateSku },
    ];
  });
}

/**
 * Refreshes the SKU of every product still marked as automatic, in catalog
 * order. Manual SKUs are reserved first, so an automatic one never takes a
 * code the user chose even when the manual product comes later in the list.
 * @param draft Current configuration draft.
 * @returns The draft with every automatic SKU derived from the current names.
 */
export function withAutoSkus(draft: SiteConfigDraft): SiteConfigDraft {
  const taken = new Set<string>();
  for (const product of draft.products) {
    if (product.skuAuto) continue;
    const sku = product.sku?.trim().toUpperCase() ?? "";
    if (sku !== "") taken.add(sku);
  }
  const products = draft.products.map((product) => {
    if (!product.skuAuto) return product;
    const sku = buildDefaultSku(draft.site.name, product.name, taken);
    taken.add(sku);
    return { ...product, sku };
  });
  return { ...draft, products };
}

/** Text fields the export omits when the user leaves them blank. */
export const OptionalTextField = {
  /** Free text shown under the category name. */
  Description: "description",
  /** Free text shown only on the product detail page. */
  LongDescription: "longDescription",
} as const;

/** Text field the export omits when the user leaves it blank. */
export type OptionalTextField =
  (typeof OptionalTextField)[keyof typeof OptionalTextField];

/**
 * Converts a validated draft text into an omitted optional field: blank values
 * are dropped instead of exported as empty strings.
 * @param key Property name of the optional field.
 * @param value Validated draft text.
 * @returns A single-entry record with the trimmed value, or an empty record
 * when the text is blank.
 */
export function optionalField<K extends OptionalTextField>(
  key: K,
  value: string | undefined,
): { [P in K]?: string } {
  const record: { [P in K]?: string } = {};
  const trimmed = value?.trim() ?? "";
  if (trimmed !== "") {
    record[key] = trimmed;
  }
  return record;
}

/**
 * Sentinel stored in the draft when the price input is blank or cannot be
 * parsed. It is negative, so the product schema reports it as a price issue,
 * and it survives the JSON round trip of the draft persistence.
 */
export const BLANK_PRICE = -1;

/**
 * Converts a numeric product price into the text shown in the price input,
 * using a decimal comma and an empty string for the blank sentinel.
 * @param price Numeric price held by the draft.
 * @returns The text to show in the input.
 */
export function toPriceInput(price: number): string {
  return price === BLANK_PRICE ? "" : String(price).replace(".", ",");
}

/**
 * Converts the text typed in the price input into the numeric price held by
 * the draft. A decimal comma is accepted, and a blank or unparsable value maps
 * to the blank sentinel so the schema reports the field.
 * @param value Raw text typed in the price input.
 * @returns The numeric price, or the blank sentinel for invalid text.
 */
export function toPriceValue(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") return BLANK_PRICE;
  const price = Number(normalized);
  return Number.isFinite(price) ? price : BLANK_PRICE;
}

/** Sentinel stored in the draft when the stock input is blank or not a number. */
export const BLANK_STOCK = -1;

/**
 * Converts a numeric stock count into the text shown in the stock input.
 * @param stock Stock count held by the draft, absent when the user left it blank.
 * @returns The text to show in the input.
 */
export function toStockInput(stock: number | undefined): string {
  return stock === undefined || stock === BLANK_STOCK ? "" : String(stock);
}

/**
 * Converts the text typed in the stock input into the draft value. A blank
 * input omits the field, while unparsable text maps to a negative sentinel so
 * the schema reports the field instead of silently dropping it.
 * @param value Raw text typed in the stock input.
 * @returns The stock count, or `undefined` when the field is blank.
 */
export function toStockValue(value: string): number | undefined {
  const normalized = value.trim();
  if (normalized === "") return undefined;
  const stock = Number(normalized);
  return Number.isFinite(stock) && Number.isInteger(stock)
    ? stock
    : BLANK_STOCK;
}

/**
 * Reads the status selected in the editor as a product status. The empty
 * option means the product declares no status and leaves the field out.
 * @param value Value of the selected option.
 * @returns The matching status, or `undefined` for the empty option.
 */
export function toStatusValue(value: string): ProductStatus | undefined {
  return Object.values(ProductStatus).find((status) => status === value);
}

/**
 * Joins the gallery image references into the text of the images input.
 * @param images Image references held by the draft, in gallery order.
 * @returns One reference per line.
 */
export function toImageListInput(
  images: readonly string[] | undefined,
): string {
  return (images ?? []).join("\n");
}

/**
 * Splits the text of the images input into gallery references, dropping blank
 * lines and trimming the ones that remain.
 * @param value Raw text typed in the images input.
 * @returns Image references in gallery order.
 */
export function toImageListValue(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((image) => image.trim())
    .filter(Boolean);
}

/**
 * Converts a typed folder path into the safe path stored in the draft. Each
 * segment is slugged on its own, so a user can type `Dulces/Tartas de manzana`
 * and get `dulces/tartas-de-manzana`, and empty segments are dropped.
 * @param value Raw folder path or subfolder name typed by the user.
 * @returns The normalized slash separated path, or an empty string for root.
 */
export function toFolderPath(value: string): string {
  return value
    .split("/")
    .map((segment) => toSlug(segment))
    .filter(Boolean)
    .join("/");
}

/**
 * Expands a folder path into itself and every ancestor path, so a nested
 * folder always brings the folders above it with it.
 * @param paths Folder paths already present in the draft.
 * @returns The paths and their ancestors, in first use order.
 */
export function withFolderAncestors(paths: readonly string[]): string[] {
  const expanded = new Set<string>();
  for (const path of paths) {
    const segments = path.split("/");
    for (let depth = 1; depth <= segments.length; depth++) {
      expanded.add(segments.slice(0, depth).join("/"));
    }
  }
  return [...expanded];
}

/**
 * Validates a draft against the formal schema and, when valid, normalizes it
 * into a `SiteConfig`: trimmed texts, optional fields omitted, flat
 * category names and normalized folder paths with their ancestors. Prices
 * are already numeric in the draft. The required short description, main image
 * and gallery travel with the other product fields, and the optional ones are
 * carried over as declared.
 *
 * Duplicate product names and SKUs are validated too, once the schema passes,
 * and raise their own issue per offending product. Duplicate category names
 * raise their own issue per offending category.
 * @param draft Raw configuration as edited in the form; text fields are strings.
 * @returns The normalized `SiteConfig` when every field is valid, otherwise
 * one `FieldIssue` per offending field, in schema order with the duplicate
 * name issues appended.
 */
export function parseSiteConfig(draft: SiteConfigDraft): SiteConfigValidation {
  const result = siteConfigDraftSchema.safeParse(draft);

  const duplicateIssues = [
    ...toDuplicateNameIssues(draft),
    ...toDuplicateSkuIssues(draft),
  ];

  if (!result.success) {
    const schemaIssues = result.error.issues.map((issue) => ({
      field: issue.path.map(String).join("."),
      code: toValidationCode(issue.message),
    }));
    return { valid: false, issues: [...schemaIssues, ...duplicateIssues] };
  }

  if (duplicateIssues.length > 0) {
    return { valid: false, issues: duplicateIssues };
  }

  const { site, folders, products, categories } = result.data;
  return {
    valid: true,
    config: {
      site: {
        name: site.name.trim(),
        description: site.description.trim(),
        contactEmail: site.contactEmail.trim(),
      },
      folders: withFolderAncestors(folders.map(toFolderPath)),
      products: products.map((product) => ({
        sku: product.sku.trim().toUpperCase(),
        name: product.name.trim(),
        folder: toFolderPath(product.folder ?? ""),
        categories: product.categories.map((category) => category.trim()),
        price: product.price,
        shortDescription: product.shortDescription.trim(),
        ...optionalField("longDescription", product.longDescription),
        ...(product.stock === undefined || product.stock === BLANK_STOCK
          ? {}
          : { stock: product.stock }),
        ...(product.status === undefined ? {} : { status: product.status }),
        mainImage: product.mainImage.trim(),
        images: product.images.map((image) => image.trim()).filter(Boolean),
      })),
      categories: categories.map((category) => ({
        name: category.name.trim(),
        ...optionalField("description", category.description),
      })),
    },
  };
}
