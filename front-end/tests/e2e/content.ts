/**
 * Sample catalog loaded from the exported package in `src/content`.
 *
 * The e2e specs derive every content expectation from these documents, so
 * replacing the committed sample changes what the site must render without
 * editing the specs. Only the localized interface copy stays in the specs.
 */
import { readFileSync, readdirSync } from "node:fs";
import { extname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ProductStatus,
  type CategoryDocument,
  type Product,
  type SiteMeta,
} from "@custom-web-builder/shared/catalog-schema";
import {
  DOCUMENT_EXTENSIONS,
  parseDocument,
} from "@custom-web-builder/shared/document-format";
import { toSlug } from "@custom-web-builder/shared/web-metadata";
import { featuredProductCount, productsPageSize } from "@/config/catalog";
import { formatPrice } from "@/lib/catalog";

const CONTENT_ROOT = fileURLToPath(
  new URL("../../src/content", import.meta.url),
);

/** Product document with the collection entry id used by its detail URL. */
export interface SampleProduct extends Product {
  /** Entry id relative to the products collection. */
  id: string;
}

/**
 * Lists the exported documents of one collection in a stable order.
 * @param folder Collection folder inside `src/content`.
 * @returns Paths relative to that folder.
 */
function listDocuments(folder: string): string[] {
  return readdirSync(join(CONTENT_ROOT, folder), { recursive: true })
    .filter((entry) =>
      DOCUMENT_EXTENSIONS.includes(extname(entry).slice(1).toLowerCase()),
    )
    .sort();
}

/**
 * Reads and parses one exported document.
 * @param path Path relative to `src/content`, whose extension selects the format.
 * @returns Parsed document.
 */
function readDocument<T>(path: string): T {
  return parseDocument(
    readFileSync(join(CONTENT_ROOT, path), "utf8"),
    path,
  ) as T;
}

/** Site metadata exported by the generator. */
export const site: SiteMeta = (() => {
  const file = readdirSync(CONTENT_ROOT).find((name) =>
    DOCUMENT_EXTENSIONS.some((extension) =>
      name.startsWith(`site.${extension}`),
    ),
  );
  if (!file) {
    throw new Error("No site document found in src/content");
  }
  return readDocument<SiteMeta>(file);
})();

/** Every product document of the committed sample, with its entry id. */
export const products: SampleProduct[] = listDocuments("products").map(
  (path) => ({
    ...readDocument<Product>(`products/${path}`),
    id: path.slice(0, -extname(path).length).split(sep).join("/"),
  }),
);

/** Every category document of the committed sample. */
export const categories: CategoryDocument[] = listDocuments("categories").map(
  (path) => readDocument<CategoryDocument>(`categories/${path}`),
);

/**
 * Returns the products a category references, in exported order.
 * @param category Category document read from the sample.
 * @returns Referenced products that exist in the sample.
 */
export function categoryProducts(category: CategoryDocument): SampleProduct[] {
  return category.products
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is SampleProduct => Boolean(product));
}

/**
 * Returns the categories a product declares through its category names.
 * @param product Product document read from the sample.
 * @returns Category documents whose id matches a declared category slug.
 */
export function productCategories(product: SampleProduct): CategoryDocument[] {
  const declared = new Set(product.categories.map((name) => toSlug(name)));
  return categories.filter((category) => declared.has(category.id));
}

/**
 * Sorts the sample products as the pages do for one locale.
 * @param locale Locale used by `localeCompare`.
 * @returns Recommended products first, then alphabetical order.
 */
export function sortedProducts(locale: string): SampleProduct[] {
  const priority = (product: SampleProduct): number => {
    if (product.status === ProductStatus.Recommended) return 0;
    if (product.status === ProductStatus.NotForSale) return 100;
    return 50;
  };
  return [...products].sort(
    (left, right) =>
      priority(left) - priority(right) ||
      left.name.localeCompare(right.name, locale),
  );
}

/**
 * Formats one exported price as the site does.
 * @param price Price in euros from a product document.
 * @param locale Locale that decides separators and symbol placement.
 * @returns Localized currency string.
 */
export function localizedPrice(price: number, locale: string): string {
  return formatPrice(price, locale);
}

/**
 * Counts the distinct images a product gallery renders.
 * @param product Product document read from the sample.
 * @returns Number of images, with the main one included once.
 */
export function productImageCount(product: SampleProduct): number {
  return new Set([product.mainImage, ...product.images].filter(Boolean)).size;
}

/**
 * Escapes a value before using it in a regular expression.
 * @param value Literal text to escape.
 * @returns The same text with regex metacharacters escaped.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Localized badge labels of the product statuses shown by the pages. */
export const statusLabels = {
  es: {
    recommended: "Recomendado",
    notForSale: "No en venta",
    stock: "Stock",
  },
  en: {
    recommended: "Recommended",
    notForSale: "Not for sale",
    stock: "In stock",
  },
} as const;

/**
 * Builds the localized URL of a product detail page.
 * @param product Product document read from the sample.
 * @param locale Locale segment of the URL.
 * @returns Path of the detail page.
 */
export function productPath(product: SampleProduct, locale: string): string {
  return `/${locale}/products/${product.id}/`;
}

/**
 * Builds the localized URL of a category page.
 * @param category Category document read from the sample.
 * @param locale Locale segment of the URL.
 * @returns Path of the category page.
 */
export function categoryPath(
  category: CategoryDocument,
  locale: string,
): string {
  return `/${locale}/categories/${category.id}/`;
}

/**
 * Builds the localized URL of one products grid page.
 * @param locale Locale segment of the URL.
 * @param page One-based page number.
 * @returns Path of the requested grid page.
 */
export function productsPagePath(locale: string, page: number): string {
  return page === 1
    ? `/${locale}/products/`
    : `/${locale}/products/page/${page}/`;
}

/** Number of pages the catalog grid renders for the committed sample. */
export const catalogPages = Math.max(
  1,
  Math.ceil(products.length / productsPageSize),
);

/** Number of products the home page features for the committed sample. */
export const featuredCount = Math.min(products.length, featuredProductCount);

/**
 * Returns the page that contains one product in display order.
 * @param product Product document read from the sample.
 * @param locale Locale whose display order is used.
 * @returns One-based page number.
 */
export function productPage(product: SampleProduct, locale: string): number {
  return (
    Math.floor(
      sortedProducts(locale).findIndex((item) => item.id === product.id) /
        productsPageSize,
    ) + 1
  );
}
