/**
 * Configuration package: the export that mirrors on disk how a shop is
 * organized.
 *
 * The package is a file tree with one side configuration file and a `products`
 * folder holding one document per product, grouped into subfolders by the
 * first letter of the product name for browsing only. Those subfolders never
 * carry category information: categories travel inside every product document
 * as a flat array, so one product produces one file regardless of how many
 * categories it has. This module builds the tree as a path/content map,
 * independent of how it is later delivered to the user.
 */
import { toSlug } from "@custom-web-builder/shared/web-metadata";
import {
  defaultExportFormat,
  type ExportFormat,
} from "@/lib/export/formats/format";
import type { Product, SiteConfig } from "@/lib/catalog/schema";

/** Folder that holds every product document of the catalog. */
export const PRODUCTS_FOLDER = "products";

/** Name of the single configuration file of the site. */
export const SITE_FILE = "site.json";

/**
 * Splits a product into the fields its own file contains, keeping the flat
 * category names and dropping the optional fields that are blank.
 * @param product Normalized product.
 * @returns The JSON-ready content of the product file.
 */
function toProductDocument(product: Product): Product {
  return {
    name: product.name,
    price: product.price,
    categories: product.categories,
    ...(product.description === undefined
      ? {}
      : { description: product.description }),
    ...(product.imageUrl === undefined ? {} : { imageUrl: product.imageUrl }),
  };
}

/**
 * Builds the file name of one product, slugged to stay readable and safe for
 * any file system.
 * @param product Normalized product.
 * @param fallbackNumber Number used in the fallback name when no
 * alphanumeric character remains: the 1-based catalog position in the export
 * and the product id in the editor preview, so preview file names never
 * shift when a product is deleted.
 * @param format Export format, which contributes the file extension.
 * @returns File name like `tarta-de-manzana.json`.
 */
function toProductFileName(
  product: Product,
  fallbackNumber: number,
  format: ExportFormat,
): string {
  const base = toSlug(product.name) || `product-${fallbackNumber}`;
  return `${base}.${format.fileExtension}`;
}

/**
 * Builds the visual folder of one product: the first alphanumeric character
 * of its slug, or `other` when the name has none. It groups files for browsing
 * only; it never carries category information, which lives in the document.
 * @param product Normalized product.
 * @param fallbackNumber Number used in the fallback file name.
 * @returns Folder name below the products folder.
 */
function toProductFolder(product: Product, fallbackNumber: number): string {
  const base = toSlug(product.name) || `product-${fallbackNumber}`;
  const initial = base.charAt(0);
  return /^[a-z0-9]$/.test(initial) ? initial : "other";
}

/**
 * Builds the only file path of one product: one document under a visual
 * folder, whatever the number of categories the product declares.
 * @param product Normalized product.
 * @param fallbackNumber Number used in the fallback file name.
 * @param format Export format, which contributes the file extension.
 * @returns The path of the product under the products folder.
 */
function toProductPath(
  product: Product,
  fallbackNumber: number,
  format: ExportFormat,
): string {
  return [
    PRODUCTS_FOLDER,
    toProductFolder(product, fallbackNumber),
    toProductFileName(product, fallbackNumber, format),
  ].join("/");
}

/**
 * Lists the paths of one product. Exported because the file tree preview of
 * the editor reuses the same computation.
 * @param product Normalized product.
 * @param fallbackNumber Number used in the fallback file name.
 * @param format Export format, which contributes the file extension.
 * @returns A single-element array with the product path.
 */
export function toProductPaths(
  product: Product,
  fallbackNumber: number,
  format: ExportFormat = defaultExportFormat,
): string[] {
  return [toProductPath(product, fallbackNumber, format)];
}

/**
 * Builds the whole configuration package as a path/content map: the site
 * configuration file first, then one product document per catalog entry.
 * @param config Validated site configuration, as returned by `parseSiteConfig`.
 * @param format Export format, which contributes the file extension and
 * serialization by delegating to the format's own serializer.
 * @returns File paths relative to the package root (always `/`-separated) and
 * their contents, in a stable build order.
 */
export function buildSiteFileMap(
  config: SiteConfig,
  format: ExportFormat = defaultExportFormat,
): Record<string, string> {
  const siteFile = `site.${format.fileExtension}`;
  const files: Record<string, string> = {
    [siteFile]: format.serialize(config.site),
  };
  config.products.forEach((product, index) => {
    files[toProductPath(product, index + 1, format)] = format.serialize(
      toProductDocument(product),
    );
  });
  return files;
}
