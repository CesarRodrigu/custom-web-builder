/**
 * Content collections backed by the package the generator exports: one document
 * per product under `products/` and one document per category under
 * `categories/`. Both collections validate their documents with the schemas of
 * the shared catalog contract, so the generator and this site cannot drift. The
 * site metadata is mirrored as constants in `src/config/site-content.ts` and is
 * not a content collection.
 */
import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import {
  categoryDocumentSchema,
  productSchema,
} from "@custom-web-builder/shared/catalog-schema";

const PATTERN = "**/*.{json,yaml,yml}";
const BASE_PATH = "./src/content";

const products = defineCollection({
  loader: glob({
    pattern: PATTERN,
    base: BASE_PATH + "/products",
  }),
  schema: productSchema,
});

const categories = defineCollection({
  loader: glob({
    pattern: PATTERN,
    base: BASE_PATH + "/categories",
  }),
  schema: categoryDocumentSchema.extend({
    products: z.array(reference("products")),
  }),
});

/** Collections read by the front-end pages. */
export const collections = { products, categories };
