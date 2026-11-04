/**
 * Formal schema of the site configuration the generator builds: the site
 * metadata plus the product catalog, expressed with a strict Zod schema.
 *
 * The editor edits a *draft* whose inputs are raw strings, so validation
 * reports one issue per offending field instead of failing the whole parse;
 * when the draft is valid it is converted into a normalized `SiteConfig`
 * ready to be exported.
 */
import { z } from "astro/zod";

/** Number-like price accepted in a draft: digits with up to two decimals. */
const PRICE_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;
/** Minimal email shape accepted to avoid unreadable regexes in error paths. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** HTTP(S) URL accepted for product images. */
const IMAGE_URL_PATTERN = /^https?:\/\/\S+$/;

/** Stable reason codes for draft issues; the editor maps each to a localized message. */
export type ValidationCode =
  "required" | "email" | "price" | "url" | "category" | "duplicate";

/** A single validation issue found in one field of the draft. */
export interface FieldIssue {
  /** Dot path of the offending field, e.g. `site.name` or `products.0.price`. */
  field: string;
  /** Code identifying the reason; the editor maps it to a localized message. */
  code: ValidationCode;
}

/** Result of validating a draft: either the normalized configuration or its issues. */
export type SiteConfigValidation =
  | {
      /** The draft satisfies every schema rule. */
      valid: true;
      /** Normalized configuration, ready to be exported. */
      config: SiteConfig;
    }
  | {
      /** At least one field does not satisfy the schema. */
      valid: false;
      /** One issue per offending field, in schema order. */
      issues: FieldIssue[];
    };

/** Raw product as edited in the form, before normalization. */
export interface ProductDraft {
  /**
   * Incremental id of the product, assigned when it is created and never
   * reused afterwards, even after the product is deleted; the editor uses it
   * as the identity of the sidebar rows and as the heading number of
   * products without a name. Editor only: it is not exported.
   */
  id: number;
  /** Display name of the product; required, unique per catalog. */
  name: string;
  /** Category paths as typed by the user, one per entry, segments separated by `/`; empty puts the product at the root of the catalog. */
  categories: string[];
  /** Free text shown under the name; blank is omitted on export. */
  description: string;
  /** Non-negative price as typed by the user, possibly with a decimal comma; required. */
  price: string;
  /** URL of the product image; blank is omitted on export. */
  imageUrl: string;
}

/** Raw site metadata as edited in the form, before normalization. */
export interface SiteMetaDraft {
  /** Display name of the generated site; required. */
  name: string;
  /** Free text describing the business; blank is omitted on export. */
  description: string;
  /** Contact email shown on the site; blank is omitted on export. */
  contactEmail: string;
}

/** Raw site configuration as edited in the form, before normalization. */
export interface SiteConfigDraft {
  /** Site metadata draft. */
  site: SiteMetaDraft;
  /** Products of the catalog, possibly empty while the user adds entries. */
  products: ProductDraft[];
}

/** Normalized product stored in the exported configuration. */
export interface Product {
  /** Display name of the product. */
  name: string;
  /** Category paths of the product, one entry per category the product belongs to; each entry lists one folder level per segment, and the empty list puts the product at the root of the catalog. */
  categories: string[][];
  /** Non-negative price of the product. */
  price: number;
  /** Free text shown under the name, when provided. */
  description?: string;
  /** URL of the product image, when provided. */
  imageUrl?: string;
}

/** Normalized site metadata stored in the exported configuration. */
export interface SiteMeta {
  /** Display name of the generated site. */
  name: string;
  /** Free text describing the business, when provided. */
  description?: string;
  /** Contact email shown on the site, when provided. */
  contactEmail?: string;
}

/**
 * The declarative document the generator consumes: the *configuración
 * declarativa* of a catalog web, produced by the editor and consumed by the
 * site builder.
 */
export interface SiteConfig {
  /** Normalized site metadata. */
  site: SiteMeta;
  /** Normalized products of the catalog, possibly empty. */
  products: Product[];
}

/**
 * Reports whether a raw draft value has visible text after trimming.
 * @param value Raw draft value.
 * @returns True when trimming leaves at least one character.
 */
const isFilled = (value: string): boolean => value.trim().length > 0;

/**
 * Builds a predicate checking a raw value, trimmed, against a full-match pattern.
 * @param pattern Pattern the trimmed value must fully match.
 * @returns Predicate reporting whether the value matches.
 */
const matches =
  (pattern: RegExp) =>
  (value: string): boolean =>
    pattern.test(value.trim());

/**
 * Builds a predicate turning a required styled check into an optional one: blank passes.
 * @param check Check applied to non blank values.
 * @returns Predicate passing blank values, applying `check` otherwise.
 */
const isEmptyOr =
  (check: (value: string) => boolean) =>
  (value: string): boolean =>
    value.trim() === "" || check(value.trim());

/**
 * Reports whether a category path is blank (product at the catalog root) or a
 * `/`-separated chain of non blank segments, allowing spaces inside segment
 * names.
 * @param value Raw category path typed by the user.
 * @returns True when the path fits the category path shape.
 */
const isValidCategoryPath = (value: string): boolean => {
  const path = value.trim();
  return (
    path === "" || path.split("/").every((segment) => segment.trim().length > 0)
  );
};

/**
 * Zod schema of a draft product. Every rule carries the code of its reason as
 * the issue message, so field issues are read back without depending on Zod's
 * default texts.
 *
 * `price` is required: a catalog entry must export a real numeric price.
 */
export const productDraftSchema = z.object({
  id: z
    .number()
    .refine((value) => Number.isInteger(value) && value > 0, "required"),
  name: z.string().refine(isFilled, "required"),
  categories: z.array(z.string().refine(isValidCategoryPath, "category")),
  description: z.string(),
  price: z.string().refine(matches(PRICE_PATTERN), "price"),
  imageUrl: z.string().refine(isEmptyOr(matches(IMAGE_URL_PATTERN)), "url"),
});

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
 * Zod schema of the whole draft configuration. Empty products are allowed: a
 * site may be exported before the user fills the catalog.
 */
export const siteConfigDraftSchema = z.object({
  site: z.object({
    name: z.string().refine(isFilled, "required"),
    description: z.string(),
    contactEmail: z.string().refine(isEmptyOr(matches(EMAIL_PATTERN)), "email"),
  }),
  products: z.array(productDraftSchema),
});

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
    return [{ field: `products.${index}.name`, code: "duplicate" }];
  });
}

/**
 * Validates a draft against the formal schema and, when valid, normalizes it
 * into a `SiteConfig` (trimmed texts, optional fields omitted, prices parsed).
 *
 * Duplicate product names are validated too, once the schema passes, and
 * raise their own issue per offending product.
 * @param draft Raw configuration as edited in the form; every field is a string.
 * @returns The normalized `SiteConfig` when every field is valid, otherwise
 * one `FieldIssue` per offending field, in schema order with the duplicate
 * name issues appended.
 */
export function parseSiteConfig(draft: SiteConfigDraft): SiteConfigValidation {
  const result = siteConfigDraftSchema.safeParse(draft);

  if (!result.success) {
    const schemaIssues = result.error.issues.map((issue) => ({
      field: issue.path.map(String).join("."),
      code: issue.message as ValidationCode,
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
        categories: product.categories.map(toCategorySegments),
        price: toPrice(product.price),
        ...optionalField("description", product.description),
        ...optionalField("imageUrl", product.imageUrl),
      })),
    },
  };
}

/**
 * Converts a validated draft text into an omitted optional field: blank values
 * are dropped instead of exported as empty strings.
 * @param key Property name of the optional field.
 * @param value Validated draft text.
 * @returns A single-entry record with the trimmed value, or an empty record
 * when the text is blank.
 */
function optionalField<K extends "description" | "contactEmail" | "imageUrl">(
  key: K,
  value: string,
): { [P in K]?: string } {
  const record: { [P in K]?: string } = {};
  const trimmed = value.trim();
  if (trimmed !== "") {
    record[key] = trimmed;
  }
  return record;
}

/**
 * Converts a validated draft price into a number, bridging the decimal comma
 * the user may have typed to the standard JSON number notation.
 * @param price Validated price text matching `PRICE_PATTERN`.
 * @returns The parsed non-negative numeric price.
 */
function toPrice(price: string): number {
  return Number(price.trim().replace(",", "."));
}

/**
 * Splits a validated category path into its segment list, dropping any path
 * with no segments (product at the catalog root). Exported because the file
 * tree preview of the editor reuses the exact same split.
 * @param categoryPath Validated category path typed by the user.
 * @returns The non blank category segments, in path order; `[]` when the
 * product belongs at the root of the catalog.
 */
export function toCategorySegments(categoryPath: string): string[] {
  const path = categoryPath.trim();
  return path === "" ? [] : path.split("/").map((segment) => segment.trim());
}
