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

/** Category document with its product references ready to be resolved. */
export interface ResolvedCategoryDocument extends Omit<
  CategoryDocument,
  "products"
> {
  /** Products that belong to the category, in display order. */
  products: ReadonlyArray<ProductReference | string>;
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
 * and the rest are treated as the same product. References may be Astro
 * reference objects or plain entry ids, so build-time and live sources share
 * this resolver.
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
      const productId =
        typeof reference === "string" ? reference : reference.id;
      const product = productsById.get(productId);

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
