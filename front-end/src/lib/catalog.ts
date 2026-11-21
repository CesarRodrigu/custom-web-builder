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

/** Category link shown on a product page. */
export interface ProductCategoryLink {
  /** Entry id of the category, used to build its URL. */
  id: string;
  /** Display name of the category. */
  name: string;
}

/** Product ready to render, with the collection entry id added to the exported document. */
export type CatalogProduct = ParsedProduct & {
  /** Entry id relative to the products collection. */
  id: string;
  /** Category names that reference the product, when the categories collection provides them. */
  categoryNames?: string[];
  /** Categories that reference the product, resolved from its references. */
  linkedCategories?: ProductCategoryLink[];
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
  };
}

/**
 * Returns the image list a product should render, main image first.
 *
 * The main image is always one of the gallery references, so the gallery is
 * deduplicated and the main image is moved to the front.
 * @param product Product document with its main image and gallery.
 * @returns Non-empty image URLs without duplicates, main image first.
 */
export function getProductImages(
  product: Pick<ParsedProduct, "mainImage" | "images">,
): string[] {
  const gallery = [
    ...new Set(product.images.map((image) => image.trim()).filter(Boolean)),
  ];
  const main = product.mainImage.trim();
  if (main === "") return gallery;
  return [main, ...gallery.filter((image) => image !== main)];
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
