/**
 * Content collections backed by the package the generator exports: one document
 * per product under `products/` and one document per category under
 * `categories/`. Both collections validate their documents with the schemas of
 * the shared catalog contract, so the generator and this site cannot drift.
 * Both declare their relationship as an Astro reference on the property that
 * holds it: `categories` on products and `products` on categories. The reader
 * resolves both with `getEntries()`. The site metadata is mirrored as constants
 * in `src/config/site-content.ts` and is not a content collection.
 */
import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import {
  categorySchema,
  productSchema,
} from "@custom-web-builder/shared/catalog-schema";
import { DOCUMENT_EXTENSIONS_GLOB } from "@custom-web-builder/shared/document-format";
import { toSlug } from "@custom-web-builder/shared/web-metadata";

const PATTERN = `**/*.${DOCUMENT_EXTENSIONS_GLOB}`;
const BASE_PATH = "./src/content";

const categoryReference = reference("categories");
const productReference = reference("products");

const products = defineCollection({
  loader: glob({
    pattern: PATTERN,
    base: BASE_PATH + "/products",
  }),
  schema: productSchema.transform((product) => ({
    ...product,
    categories: product.categories.map((name) =>
      categoryReference.parse(toSlug(name)),
    ),
  })),
});

const categories = defineCollection({
  loader: glob({
    pattern: PATTERN,
    base: BASE_PATH + "/categories",
    generateId: ({ data }) => data.id as string,
  }),
  schema: categorySchema.extend({
    products: z.array(productReference),
  }),
});

/** Collections read by the front-end pages. */
export const collections = { products, categories };
