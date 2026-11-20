/**
 * Category document contract of the configuration package.
 *
 * A category document lists the products it contains by their entry id. It is
 * optional sample content of the front-end: the generator puts the categories
 * inside each product document, so a generated package has no `categories/**`
 * folder. The front-end resolves the references against the product collection,
 * so the document stores strings and the resolved shape is declared next to it.
 */
import { z } from "astro/zod";

/**
 * Reference from a category to one entry of the products collection.
 *
 * This is the shape a resolved category document exposes, not the on-disk
 * format: the exported document stores the entry ids as strings.
 */
export const productReferenceSchema = z.object({
  /** Collection the reference points to; categories only reference `products`. */
  collection: z.string(),
  /** Entry id relative to the `products` collection, e.g. `panes/baguette`. */
  id: z.string(),
});

/** Reference from a category to one entry of the products collection. */
export type ProductReference = z.infer<typeof productReferenceSchema>;

/** Zod schema of the exported category document. */
export const categoryDocumentSchema = z.object({
  /** Display name of the category. */
  name: z.string(),
  /** Free text shown under the name, when provided. */
  description: z.string().optional(),
  /** Entry ids of the products that belong to the category, in display order. */
  products: z.array(z.string()),
});

/** Optional category document read by the front-end from `categories/**`. */
export type CategoryDocument = z.infer<typeof categoryDocumentSchema>;
