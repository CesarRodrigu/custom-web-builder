/**
 * Runtime shapes and helpers of the catalog exported by the generator.
 *
 * The exported package stores the categories inside every product document,
 * so the reader treats the collection as a flat list: subfolders are only a
 * visual grouping of the files and never carry category information.
 */
import { catalogCurrency } from "@/config/catalog";
import {
  ProductStatus,
  type ParsedProduct,
} from "@custom-web-builder/shared/catalog-schema";

/** Product ready to render, with the collection entry id added to the exported document. */
export type CatalogProduct = ParsedProduct & {
  /** Entry id relative to the products collection. */
  id: string;
  /** Category names that reference the product, when the categories collection provides them. */
  categoryNames?: string[];
};

/**
 * Turns a category slug into a human-readable label.
 * @param segment Slug of one category level, e.g. `masa-madre`.
 * @returns Label with hyphens replaced by spaces and the first letter uppercased.
 */
export function toCategoryLabel(segment: string): string {
  const words = segment.replaceAll("-", " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Adds the collection entry id to one exported product document.
 *
 * The fields of the returned product start from the document itself, so every
 * value the pages render comes from the exported file and a field added to the
 * shared schema is carried over without a second mapping.
 * @param id Entry id relative to the products collection.
 * @param document Validated product document read from the collection.
 * @returns Product ready to render, with its category names from the document.
 */
export function toCatalogProduct(
  id: string,
  document: ParsedProduct,
): CatalogProduct {
  return {
    ...document,
    id,
    shortDescription: document.shortDescription ?? document.description,
  };
}

/**
 * Returns the image list a product should render, in gallery order.
 *
 * The generator can export a single `imageUrl` for older packages or an
 * `images` array for ecommerce galleries; the single image is used as a
 * one-item gallery when the array is missing or empty.
 * @param product Product document with either the single image or the array.
 * @returns Non-empty image URLs without duplicates; empty when the product has no artwork.
 */
export function getProductImages(
  product: Pick<ParsedProduct, "imageUrl" | "images">,
): string[] {
  const images = (product.images ?? [])
    .map((image) => image.trim())
    .filter(Boolean);

  if (images.length > 0) {
    return [...new Set(images)];
  }

  return product.imageUrl ? [product.imageUrl] : [];
}

/**
 * Collapses repeated documents of the same product into one, keeping every
 * category name once.
 *
 * The generator writes one file per product now, so this is a safety net for
 * packages exported before that change, which repeated the document inside
 * each category folder.
 * @param products Products read from the collection, possibly repeated.
 * @returns One product per unique name, in first-seen order.
 */
export function mergeCatalogProducts(
  products: readonly CatalogProduct[],
): CatalogProduct[] {
  const byName = new Map<string, CatalogProduct>();

  for (const product of products) {
    const existing = byName.get(product.name);
    if (!existing) {
      byName.set(product.name, {
        ...product,
        categories: [...new Set(product.categories)],
      });
      continue;
    }

    for (const category of product.categories) {
      if (!existing.categories.includes(category)) {
        existing.categories.push(category);
      }
    }
  }

  return [...byName.values()];
}

/**
 * Returns a new product list ready for display: recommended products first and
 * every group sorted by display name.
 *
 * A product without a status counts as normal, and a product not for sale keeps
 * the alphabetical position of a normal product so its badge is the only thing
 * that sets it apart.
 * @param products Products to sort; the input array is not mutated.
 * @param locale Locale used by `localeCompare`, so accents sort as readers expect.
 * @returns Products with the recommended ones first, then alphabetical order.
 */
export function sortProductsForDisplay(
  products: readonly CatalogProduct[],
  locale: string,
): CatalogProduct[] {
  return [...products].sort((left, right) => {
    const priorityDifference =
      getDisplayPriority(left.status) - getDisplayPriority(right.status);

    return priorityDifference !== 0
      ? priorityDifference
      : left.name.localeCompare(right.name, locale);
  });
}

/**
 * Sort priority of a product status, so recommended products come first.
 * @param status Status of the product, when the export declares one.
 * @returns Lower numbers sort before higher ones.
 */
function getDisplayPriority(status?: ProductStatus): number {
  switch (status) {
    case ProductStatus.Recommended:
      return 0;
    case ProductStatus.NotForSale:
      return 100;
    default:
      return 50;
  }
}

/**
 * Formats a price with the catalog currency in the requested locale.
 * @param price Non-negative amount.
 * @param locale Locale that decides separators and symbol placement.
 * @returns Localized currency string, e.g. `18,50 €`.
 */
export function formatPrice(price: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: catalogCurrency,
  }).format(price);
}
