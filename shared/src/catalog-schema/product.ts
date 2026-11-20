/**
 * Product contract of the configuration package and of the editor that writes
 * it.
 *
 * A product carries its own data and its flat category names. The generator
 * writes one document per category folder chain, but the categories are also
 * part of the document, so the reader never has to recover them from the file
 * path. One schema describes the product in both places: the writer, the
 * editor and the front-end all validate against this definition. The optional
 * editor-only `id` and the optional fields of older packages are part of the
 * same shape, so a field added here reaches every consumer at once.
 */
import { z } from "astro/zod";

import {
  IMAGE_URL_PATTERN,
  ValidationCode,
  isFilled,
  isValidCategoryName,
  matches,
} from "./validation";

/**
 * Statuses a product document can declare.
 *
 * A product without a status is a normal product. Recommended products are
 * highlighted and listed first; products not for sale keep their place in the
 * alphabetical order but show their status on the card and detail page.
 */
export const ProductStatus = {
  /** Highlights the product and moves it to the front of every product list. */
  Recommended: "recommended",
  /** Marks the product as unavailable for purchase. */
  NotForSale: "not-for-sale",
} as const;

/** Status a product document can declare. */
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

/**
 * Reports whether a number uses at most two decimal places.
 * @param value Numeric price to check.
 * @returns True when the decimal notation has no more than two places.
 */
function hasAtMostTwoDecimals(value: number): boolean {
  return /^\d+(?:\.\d{1,2})?$/.test(String(value));
}

/**
 * Reports whether an image reference is blank, a public path or an HTTP(S) URL.
 *
 * Exported documents use public paths under `/images/`, while a draft may
 * carry a full URL. Both travel through the same field, so the schema accepts
 * either form and still rejects other schemes.
 * @param value Raw image reference.
 * @returns True when the reference is blank, public or an HTTP(S) URL.
 */
function isProductImageReference(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed === "" ||
    trimmed.startsWith("/") ||
    matches(IMAGE_URL_PATTERN)(trimmed)
  );
}

/**
 * Zod schema of a product, shared by the editor and the exported package.
 *
 * `name`, `price` and `categories` are required: the generator always writes
 * them and every reader needs them. Prices are numbers with at most two
 * decimals; the editor converts the decimal comma it accepts in its inputs
 * before validating. Every rule emits a stable `ValidationCode` as its issue
 * message, so the editor can localize it without inspecting the rule. The
 * remaining fields are optional because the exporter omits blank values and
 * older packages may not have them.
 */
export const productSchema = z.object({
  /** Incremental id of the product; editor only, absent from exported documents. */
  id: z.number().int().positive().optional(),
  /** Display name of the product; required. */
  name: z.string().refine(isFilled, ValidationCode.Required),
  /** Non-negative price with at most two decimals; required. */
  price: z
    .number({ error: ValidationCode.Price })
    .refine(
      (value) => value >= 0 && hasAtMostTwoDecimals(value),
      ValidationCode.Price,
    ),
  /** Flat category names, each a single non blank label. */
  categories: z.array(
    z.string().refine(isValidCategoryName, ValidationCode.Category),
  ),
  /** Short free text shown under the name on cards and detail pages, when provided. */
  shortDescription: z.string().optional(),
  /** Long free text shown only on the detail page, when provided. */
  longDescription: z.string().optional(),
  /**
   * Short free text of packages exported before `shortDescription` existed;
   * readers fall back to it when the newer field is missing, and the editor
   * writes it because it is the only description field it exposes.
   * @deprecated Write `shortDescription` instead.
   */
  description: z.string().optional(),
  /** Units available in stock, when the export tracks them. */
  stock: z.number().int().nonnegative().optional(),
  /** Highlight or availability status, when the product declares one. */
  status: z.enum(ProductStatus).optional(),
  /** URL or public path of the main product image, when provided. */
  imageUrl: z
    .string()
    .refine(isProductImageReference, ValidationCode.Url)
    .optional(),
  /** URLs or public paths of every product image, in gallery order. */
  images: z.array(z.string()).optional().default([]),
});

/** Normalized product of the configuration the generator exports. */
export type Product = z.input<typeof productSchema>;

/**
 * Product document once read back, with the defaults of the schema applied.
 * The editor-only id is omitted: exported documents never carry it.
 */
export type ParsedProduct = Omit<z.output<typeof productSchema>, "id">;

/**
 * Product as edited in the form: the same document, always carrying an id and
 * the two text fields the form renders, even when the user leaves them blank.
 */
export type ProductDraft = Product & {
  /** Incremental id the editor uses to track the row. */
  id: number;
  /** Free text shown under the name; blank while editing. */
  description: string;
  /** Image reference; blank while editing. */
  imageUrl: string;
};

/**
 * Plain text fields of a product that the editor edits with one input each;
 * categories and the editor-only id are handled by their own controls.
 */
export const ProductTextField = {
  /** Display name of the product. */
  Name: "name",
  /** Free text shown under the name. */
  Description: "description",
  /** Non-negative price of the product. */
  Price: "price",
  /** URL of the product image. */
  ImageUrl: "imageUrl",
} as const satisfies Record<string, keyof ProductDraft>;

/** Plain text field of a product that the editor edits with one input. */
export type ProductTextField =
  (typeof ProductTextField)[keyof typeof ProductTextField];
