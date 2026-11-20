/**
 * Validation and normalization of the site configuration.
 *
 * Every type, schema and validation code is defined once in the shared
 * workspace package; this module keeps only the behaviour that turns a draft
 * into a normalized configuration, so adding a field to the shared model
 * reaches the editor and the exported package without a second definition.
 */
import {
  ValidationCode,
  siteConfigDraftSchema,
  toValidationCode,
  type FieldIssue,
  type ProductDraft,
  type SiteConfigDraft,
  type SiteConfigValidation,
} from "@custom-web-builder/shared/catalog-schema";

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
  toValidationCode,
  isEmptyOr,
  isFilled,
  isValidCategoryName,
  matches,
  type FieldIssue,
  type Product,
  type ProductDraft,
  type SiteConfig,
  type SiteConfigDraft,
  type SiteConfigValidation,
  type SiteMeta,
  type SiteMetaDraft,
  type StoredDraft,
} from "@custom-web-builder/shared/catalog-schema";

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

/** Text fields the export omits when the user leaves them blank. */
export const OptionalTextField = {
  /** Free text shown under the product name or describing the business. */
  Description: "description",
  /** Contact email shown on the generated site. */
  ContactEmail: "contactEmail",
  /** Main image of a product. */
  ImageUrl: "imageUrl",
} as const;

/** Text field the export omits when the user leaves it blank. */
export type OptionalTextField =
  (typeof OptionalTextField)[keyof typeof OptionalTextField];

/**
 * Converts a validated draft text into an omitted optional field: blank values
 * and absent fields are dropped instead of exported as empty strings.
 * @param key Property name of the optional field.
 * @param value Validated draft text, absent in older exported documents.
 * @returns A single-entry record with the trimmed value, or an empty record
 * when the text is blank or absent.
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

/**
 * Validates a draft against the formal schema and, when valid, normalizes it
 * into a `SiteConfig`: trimmed texts, optional fields omitted and flat
 * category names. Prices are already numeric in the draft.
 *
 * Duplicate product names are validated too, once the schema passes, and
 * raise their own issue per offending product.
 * @param draft Raw configuration as edited in the form; text fields are strings.
 * @returns The normalized `SiteConfig` when every field is valid, otherwise
 * one `FieldIssue` per offending field, in schema order with the duplicate
 * name issues appended.
 */
export function parseSiteConfig(draft: SiteConfigDraft): SiteConfigValidation {
  const result = siteConfigDraftSchema.safeParse(draft);

  if (!result.success) {
    const schemaIssues = result.error.issues.map((issue) => ({
      field: issue.path.map(String).join("."),
      code: toValidationCode(issue.message),
    }));
    return {
      valid: false,
      issues: [...schemaIssues, ...toDuplicateNameIssues(draft)],
    };
  }

  const duplicateIssues = toDuplicateNameIssues(draft);
  if (duplicateIssues.length > 0) {
    return { valid: false, issues: duplicateIssues };
  }

  const { site, products } = result.data;
  return {
    valid: true,
    config: {
      site: {
        name: site.name.trim(),
        ...optionalField("description", site.description),
        ...optionalField("contactEmail", site.contactEmail),
      },
      products: products.map((product) => ({
        name: product.name.trim(),
        categories: product.categories.map((category) => category.trim()),
        price: product.price,
        ...optionalField("description", product.description),
        ...optionalField("imageUrl", product.imageUrl),
      })),
    },
  };
}
