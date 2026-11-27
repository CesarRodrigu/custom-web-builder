/**
 * Reads the configuration package the generator exports from the content
 * collections defined in `src/content.config.ts`.
 *
 * Both collections declare their relationship as an Astro reference on the
 * property that holds it: `categories` on products and `products` on
 * categories. Only `loadProducts` and `loadCategories` depend on the Astro
 * source and resolve those references, so a live collection replaces their
 * bodies and leaves the catalog builder untouched.
 */
import { getCollection, getEntries } from "astro:content";
import {
  sortProductsForDisplay,
  toCatalogProduct,
  type CatalogProduct,
} from "@/lib/catalog";
import type { CatalogCategory, ResolvedCategoryDocument } from "@/lib/category";
import type { Locale } from "@/config/site";
import type { GetStaticPathsOptions, GetStaticPathsResult } from "astro";
import type { ParsedProduct } from "@custom-web-builder/shared/catalog-schema";
import { productsPageSize } from "@/config/catalog";

/** Entry shape shared by build-time and live content collections. */
export interface CatalogEntry<TData> {
  /** Entry id, unique inside its collection. */
  id: string;
  /** Validated document carried by the entry. */
  data: TData;
}

/** Product document read from its collection, with its category references. */
export type ReferencedProductDocument = Omit<ParsedProduct, "categories"> & {
  categories: Array<{ collection: "categories"; id: string }>;
};

/** Category document read from its collection, with its product references. */
export type ReferencedCategoryDocument = Omit<
  ResolvedCategoryDocument,
  "products"
> & {
  products: Array<{ collection: "products"; id: string }>;
};

/**
 * Returns the category entries a product references.
 * @param product Product entry read from the collection.
 * @returns Referenced categories, without those missing from the collection.
 */
export async function getProductCategories(
  product: CatalogEntry<ReferencedProductDocument>,
): Promise<CatalogEntry<ResolvedCategoryDocument>[]> {
  const referenced = await getEntries(product.data.categories);
  return referenced
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .map((entry) => ({ id: entry.id, data: entry.data }));
}

/**
 * Returns the product entries a category references.
 * @param category Category entry read from the collection.
 * @returns Referenced products, without those missing from the collection.
 */
export async function getCategoryProducts(
  category: CatalogEntry<ReferencedCategoryDocument>,
): Promise<CatalogEntry<ReferencedProductDocument>[]> {
  const referenced = await getEntries(category.data.products);
  return referenced
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .map((entry) => ({ id: entry.id, data: entry.data }));
}

/**
 * Reads every product and resolves the categories it references.
 *
 * This is one of the two functions tied to the collection API. A live source
 * replaces its body with `getLiveCollection` and `getLiveEntry`, unwraps
 * `entries` and handles `error`, and leaves the catalog builder untouched.
 * @returns Products ready to render, with their category names.
 */
export async function loadProducts(): Promise<CatalogProduct[]> {
  const entries = await getCollection("products");

  return Promise.all(
    entries.map(async (entry) => {
      const referenced = await getProductCategories(entry);
      const categoryNames = referenced.map((category) => category.data.name);
      const linkedCategories = referenced.map((category) => ({
        id: category.id,
        name: category.data.name,
      }));

      return {
        ...toCatalogProduct(entry.id, {
          ...entry.data,
          categories: categoryNames,
        }),
        categoryNames,
        linkedCategories,
      };
    }),
  );
}

/**
 * Reads every category and resolves the products it references.
 *
 * This is one of the two functions tied to the collection API. A live source
 * replaces its body with `getLiveCollection` and `getLiveEntry`, unwraps
 * `entries` and handles `error`, and leaves the catalog builder untouched.
 * @returns Categories ready to render, with their referenced products.
 */
export async function loadCategories(): Promise<CatalogCategory[]> {
  const entries = await getCollection("categories");

  return Promise.all(
    entries.map(async (entry) => {
      const referenced = await getCategoryProducts(entry);
      const products = await Promise.all(
        referenced.map(async (product) => {
          const categoryNames = (await getProductCategories(product)).map(
            (category) => category.data.name,
          );

          return {
            ...toCatalogProduct(product.id, {
              ...product.data,
              categories: categoryNames,
            }),
            categoryNames,
          };
        }),
      );

      return {
        id: entry.id,
        name: entry.data.name,
        ...(entry.data.description
          ? { description: entry.data.description }
          : {}),
        products,
      };
    }),
  );
}

/**
 * Builds one static path per product of the catalog.
 * @returns One path per product, with the product and its categories as props.
 */
export async function getProductStaticPaths(): Promise<GetStaticPathsResult> {
  const products = await loadProducts();

  return products.map((product) => ({
    params: { id: product.id },
    props: {
      product,
      categories: product.linkedCategories ?? [],
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
  const products = await loadProducts();
  const sorted = sortProductsForDisplay(products, locale);

  return paginate(sorted, { pageSize: productsPageSize });
}

/**
 * Builds one static path per category of the catalog.
 * @returns One path per category, with the category as prop.
 */
export async function getCategoryStaticPaths(): Promise<GetStaticPathsResult> {
  const categories = await loadCategories();

  return categories.map((category) => ({
    params: { id: category.id },
    props: { category },
  }));
}
