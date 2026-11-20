/**
 * Runtime shapes and helpers of the catalog categories.
 *
 * A category document lists the products it contains as content-collection
 * references, so the loader has to resolve them against the exported products.
 */
import { getProductImages, type CatalogProduct } from "@/lib/catalog";
import type {
  CategoryDocument,
  ProductReference,
} from "@custom-web-builder/shared/catalog-schema";

/** Category document once the collection has resolved its product references. */
export interface ResolvedCategoryDocument extends Omit<
  CategoryDocument,
  "products"
> {
  /** Products that belong to the category, in display order. */
  products: ProductReference[];
}

/** Category ready to render, with the products its document references. */
export interface CatalogCategory {
  /** Entry id relative to the categories collection, e.g. `panes`. */
  id: string;
  /** Display name of the category. */
  name: string;
  /** Free text shown under the name, when provided. */
  description?: string;
  /** Referenced products that exist in the export, in document order. */
  products: CatalogProduct[];
}

/**
 * Resolves the product references of a category against the exported catalog.
 *
 * References to products missing from the export are dropped instead of
 * failing the build, so one stale reference does not hide the whole category.
 * A product with several category files appears once: the first reference wins
 * and the rest are treated as the same product.
 * @param id Entry id relative to the categories collection.
 * @param document Validated category document.
 * @param productsById Exported products indexed by their entry id.
 * @returns The renderable category with every reference it resolves.
 */
export function toCatalogCategory(
  id: string,
  document: ResolvedCategoryDocument,
  productsById: ReadonlyMap<string, CatalogProduct>,
): CatalogCategory {
  const listedProducts = new Set<string>();
  const category: CatalogCategory = {
    id,
    name: document.name,
    products: document.products.flatMap((reference) => {
      const product = productsById.get(reference.id);

      if (!product || listedProducts.has(product.name)) {
        return [];
      }

      listedProducts.add(product.name);
      return [product];
    }),
  };

  if (document.description) {
    category.description = document.description;
  }

  return category;
}

/**
 * Adds the category names that reference each product to the merged catalog.
 *
 * Category membership lives in the categories collection, so a product can
 * belong to any number of categories regardless of its folder chain. Products
 * without an explicit category keep only their path-derived categories.
 * @param products Merged products of the catalog.
 * @param categories Categories with their references already resolved.
 * @returns New products carrying their category names; the input is not mutated.
 */
export function withCategoryMemberships(
  products: readonly CatalogProduct[],
  categories: readonly CatalogCategory[],
): CatalogProduct[] {
  return products.map((product) => {
    const categoryNames = categories
      .filter((category) =>
        category.products.some((candidate) => candidate.name === product.name),
      )
      .map((category) => category.name);

    return categoryNames.length === 0 ? product : { ...product, categoryNames };
  });
}

/**
 * Replaces the products of each category with their catalog counterpart.
 *
 * Category pages render the products resolved from the category document, but
 * those instances do not know every category that references them. Swapping
 * them for the merged products of the catalog lets each card show all of its
 * category badges.
 * @param categories Categories whose product lists are rewritten.
 * @param products Merged products carrying their category memberships.
 * @returns New categories with the enriched products; neither input is mutated.
 */
export function withEnrichedCategoryProducts(
  categories: readonly CatalogCategory[],
  products: readonly CatalogProduct[],
): CatalogCategory[] {
  const productsByName = new Map(
    products.map((product) => [product.name, product]),
  );

  return categories.map((category) => ({
    ...category,
    products: category.products.map(
      (product) => productsByName.get(product.name) ?? product,
    ),
  }));
}

/**
 * Returns a new category list sorted by display name for the requested locale.
 * @param categories Categories to sort; the input array is not mutated.
 * @param locale Locale used by `localeCompare`, so accents sort as readers expect.
 * @returns Categories sorted alphabetically.
 */
export function sortCategoriesByName(
  categories: readonly CatalogCategory[],
  locale: string,
): CatalogCategory[] {
  return [...categories].sort((left, right) =>
    left.name.localeCompare(right.name, locale),
  );
}

/**
 * Returns the first image of the first referenced product that has artwork.
 *
 * Used by the categories index to give each card a cover without requiring an
 * extra field in the category document.
 * @param category Category whose products are inspected in document order.
 * @returns URL of the first available image, or `undefined` when no product has one.
 */
export function getCategoryCoverImage(
  category: CatalogCategory,
): string | undefined {
  return category.products
    .map((product) => getProductImages(product)[0])
    .find((image): image is string => image !== undefined);
}

/**
 * Finds the categories a product belongs to.
 *
 * Products are identified by name because the generator writes the same
 * product once per category folder and `mergeCatalogProducts` collapses those
 * duplicates by name.
 * @param categories Categories read from the collection.
 * @param product Product to look up.
 * @returns Categories whose references include the product, in collection order.
 */
export function findProductCategories(
  categories: readonly CatalogCategory[],
  product: CatalogProduct,
): CatalogCategory[] {
  return categories.filter((category) =>
    category.products.some((candidate) => candidate.name === product.name),
  );
}
