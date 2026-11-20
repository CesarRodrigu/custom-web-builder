/**
 * Reads the configuration package the generator exports from the content
 * collections defined in `src/content.config.ts`.
 */
import { getCollection } from "astro:content";
import {
  mergeCatalogProducts,
  sortProductsForDisplay,
  toCatalogProduct,
  type CatalogProduct,
} from "@/lib/catalog";
import {
  findProductCategories,
  toCatalogCategory,
  withCategoryMemberships,
  withEnrichedCategoryProducts,
  type CatalogCategory,
} from "@/lib/category";
import type { Locale } from "@/config/site";
import type { GetStaticPathsOptions, GetStaticPathsResult } from "astro";
import { productsPageSize } from "@/config/catalog";

/** Products and categories read from the exported configuration. */
export interface Catalog {
  /** Products of the exported catalog, in collection order. */
  products: CatalogProduct[];
  /** Categories of the exported catalog, with their referenced products resolved. */
  categories: CatalogCategory[];
}

/**
 * Reads every `products/**\/*.json` and `categories/**\/*.json` file from
 * `src/content`.
 *
 * The content root mirrors the package the generator downloads, so the
 * exported ZIP can be unzipped into `src/content` without renaming files. The
 * site metadata is not part of this catalog: it lives as constants in
 * `src/config/site-content.ts`, so the `site` collection is never loaded.
 * @returns Every product and every category of the catalog.
 */
export async function loadCatalog(): Promise<Catalog> {
  const [productEntries, categoryEntries] = await Promise.all([
    getCollection("products"),
    getCollection("categories"),
  ]);

  const productsById = new Map(
    productEntries.map((entry) => [
      entry.id,
      toCatalogProduct(entry.id, entry.data),
    ]),
  );

  const categories = categoryEntries.map((entry) =>
    toCatalogCategory(entry.id, entry.data, productsById),
  );

  const products = withCategoryMemberships(
    mergeCatalogProducts([...productsById.values()]),
    categories,
  );

  return {
    products,
    categories: withEnrichedCategoryProducts(categories, products),
  };
}

/**
 * Builds one static path per product of the catalog.
 * @returns One path per product, with the product and its categories as props.
 */
export async function getProductStaticPaths(): Promise<GetStaticPathsResult> {
  const { products, categories } = await loadCatalog();

  return products.map((product) => ({
    params: { id: product.id },
    props: {
      product,
      categories: findProductCategories(categories, product),
    },
  }));
}

/**
 * Builds the static paths of the paginated products grid for one locale.
 * @param locale Locale that decides the display order of the products.
 * @param paginate Pagination helper Astro provides to split the sorted products into pages.
 * @returns One path per page, with its slice of products as props.
 */
export async function getProductsPageStaticPaths(
  locale: Locale,
  paginate: GetStaticPathsOptions["paginate"],
): Promise<GetStaticPathsResult> {
  const { products } = await loadCatalog();
  const sorted = sortProductsForDisplay(products, locale);

  return paginate(sorted, { pageSize: productsPageSize });
}

/**
 * Builds one static path per category of the catalog.
 * @returns One path per category, with the category as prop.
 */
export async function getCategoryStaticPaths(): Promise<GetStaticPathsResult> {
  const { categories } = await loadCatalog();

  return categories.map((category) => ({
    params: { id: category.id },
    props: { category },
  }));
}
