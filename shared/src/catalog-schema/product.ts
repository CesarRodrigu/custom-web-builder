/**
 * Product contract of the configuration package and of the editor that writes
 * it.
 *
 * A product carries its own data and its flat category names. The generator
 * writes one document per product and the front-end reads it back, so
 * `productSchema` is the document contract: it holds only the fields that are
 * exported. The editor edits `productDraftSchema`, which extends the document
 * schema with the editor-only `id` and `skuAuto`. The writer, the editor and
 * the front-end therefore share one definition, so a field added to the
 * document reaches every consumer at once.
 */
import { z } from "astro/zod";

import {
  IMAGE_URL_PATTERN,
  ValidationCode,
  isEmptyOr,
  isFilled,
  isValidCategoryName,
  isValidFolderPath,
  isValidSku,
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
 * Reports whether the main image belongs to the gallery: both are blank, or
 * the main image is one of the gallery references.
 * @param product Product carrying the main image and its gallery.
 * @param product.mainImage Primary image reference.
 * @param product.images Gallery references.
 * @returns True when the main image is blank with an empty gallery, or listed
 * in the gallery.
 */
export function isMainImageConsistent(product: {
  mainImage: string;
  images: readonly string[];
}): boolean {
  const main = product.mainImage.trim();
  const images = product.images.map((image) => image.trim());
  return main === "" ? images.length === 0 : images.includes(main);
}

/**
 * Properties of the exported product document, with their types and no
 * validation rules.
 *
 * Every variant derives from this shape: the document and the draft add their
 * rules, and the stored draft derives its partial here, so no editing rule
 * reaches the persisted document.
 */
export const productDocumentShape = z.object({
  /** Commercial code of the product. */
  sku: z.string(),
  /** Display name of the product. */
  name: z.string(),
  /** Price of the product. */
  price: z.number(),
  /** Flat category names of the product. */
  categories: z.array(z.string()),
  /** Folder path below `products/`, when the product is not at the root. */
  folder: z.string().optional(),
  /** Short free text shown under the name on cards and detail pages. */
  shortDescription: z.string(),
  /** Long free text shown only on the detail page, when provided. */
  longDescription: z.string().optional(),
  /** Units available in stock, when the export tracks them. */
  stock: z.number().optional(),
  /** Highlight or availability status, when the product declares one. */
  status: z.enum(ProductStatus).optional(),
  /** Primary image of the product. */
  mainImage: z.string(),
  /** URLs or public paths of every product image, in gallery order. */
  images: z.array(z.string()),
});

/**
 * Zod schema of the exported product document, before the cross-field check.
 *
 * It applies the field rules to `productDocumentShape`. `sku`, `name`, `price`,
 * `categories`, `folder`, `shortDescription`, `mainImage` and `images` are
 * always written by the generator and every reader needs them. Prices are
 * numbers with at most two decimals; the editor converts the decimal comma it
 * accepts in its inputs before validating. Every rule emits a stable
 * `ValidationCode` as its issue message, so the editor can localize it without
 * inspecting the rule. The remaining fields are optional because the exporter
 * omits blank values.
 */
const productDocumentSchema = productDocumentShape.extend({
  /** Commercial code of the product. */
  sku: z
    .string()
    .refine(isFilled, ValidationCode.Required)
    .refine(isValidSku, ValidationCode.Sku),
  /** Display name of the product. */
  name: z.string().refine(isFilled, ValidationCode.Required),
  /** Non-negative price with at most two decimals. */
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
  /** Folder path below `products/`, blank when the product stays at the root. */
  folder: z
    .string()
    .refine(isEmptyOr(isValidFolderPath), ValidationCode.Folder)
    .optional(),
  /** Short free text shown under the name on cards and detail pages. */
  shortDescription: z.string().refine(isFilled, ValidationCode.Required),
  /** Units available in stock, when the export tracks them. */
  stock: z.number().int().nonnegative().optional(),
  /** Primary image, one of the gallery references or blank without a gallery. */
  mainImage: z.string().refine(isProductImageReference, ValidationCode.Url),
  /** URLs or public paths of every product image, in gallery order. */
  images: z.array(
    z.string().refine(isProductImageReference, ValidationCode.Url),
  ),
});

/**
 * Zod schema of the exported product document: the document shape plus the
 * rule that the main image belongs to the gallery.
 */
export const productSchema = productDocumentSchema.superRefine(
  (product, context) => {
    if (!isMainImageConsistent(product)) {
      context.addIssue({
        code: "custom",
        message: ValidationCode.MainImage,
        path: ["mainImage"],
      });
    }
  },
);

/** Normalized product of the configuration the generator exports. */
export type Product = z.input<typeof productSchema>;

/**
 * Product document once read back, with the defaults of the schema applied.
 * Exported documents never carry editor-only fields.
 */
export type ParsedProduct = z.output<typeof productSchema>;

/**
 * Properties of a product as edited in the form, with no validation rules.
 *
 * It adds the editor-only fields to `productDocumentShape` and makes the folder
 * always present, as the form renders it even when blank. The stored draft
 * derives its partial from this shape.
 */
export const productDraftShape = productDocumentShape.extend({
  /** Incremental id of the product; editor only. */
  id: z.number(),
  /** Whether the SKU still follows the product and site data automatically. */
  skuAuto: z.boolean(),
  /** Folder path below `products/`; blank while the product is at the root. */
  folder: z.string(),
});

/**
 * Zod schema of a product as edited in the form.
 *
 * It applies the editing rules to `productDocumentSchema` and adds the fields
 * that only exist while the user edits: the row id and whether the SKU still
 * follows the catalog data. The cross-field main image rule is applied by the
 * configuration schema, so the editor reports it once per product.
 */
export const productDraftSchema = productDocumentSchema.extend({
  /** Incremental id of the product; editor only. */
  id: z.number({ error: ValidationCode.Required }).int().positive(),
  /** Whether the SKU still follows the product and site data automatically. */
  skuAuto: z.boolean(),
  /** Folder path below `products/`; blank while the product is at the root. */
  folder: z
    .string()
    .refine(isEmptyOr(isValidFolderPath), ValidationCode.Folder),
});

/**
 * Product as edited in the form: the exported document extended with the
 * editor-only fields.
 */
export type ProductDraft = z.input<typeof productDraftSchema>;

/**
 * Plain text fields of a product that the editor edits with one input each;
 * categories and the editor-only id are handled by their own controls.
 */
export const ProductTextField = {
  /** Commercial code of the product. */
  Sku: "sku",
  /** Display name of the product. */
  Name: "name",
  /** Non-negative price of the product. */
  Price: "price",
  /** Primary image of the product. */
  MainImage: "mainImage",
} as const satisfies Record<string, keyof ProductDraft>;

/** Plain text field of a product that the editor edits with one input. */
export type ProductTextField =
  (typeof ProductTextField)[keyof typeof ProductTextField];
