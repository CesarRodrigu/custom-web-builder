/**
 * Configuration package: the export that mirrors on disk how a shop is
 * organized.
 *
 * The package is a file tree with one side configuration file and one folder
 * per catalog level, so each product lives inside the subfolder chain the
 * user picked for it (category, subcategory, sub-subcategory, …). This
 * module builds that tree as a path/content map, independent of how the tree
 * is later delivered to the user (a ZIP blob in the browser, written files in
 * a CLI, …).
 */
import { toSlug } from "@/lib/metadata";
import {
  defaultExportFormat,
  type ExportFormat,
} from "@/lib/export/formats/format";
import type { Product, SiteConfig } from "@/lib/catalog/schema";

/** Folder that holds the products of the catalog, nested by category levels. */
export const PRODUCTS_FOLDER = "products";

/** Name of the single configuration file of the site. */
export const SITE_FILE = "site.json";

/**
 * Splits a product into the fields its own file contains, dropping the
 * optional ones so files stay minimal and the categories are only expressed
 * by the folder chains the product lives in.
 * @param product Normalized product.
 * @returns The JSON-ready content of the product file.
 */
function toProductDocument(product: Product) {
  return {
    name: product.name,
    price: product.price,
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
 * Builds the folder chain of one category path: one slug per level, named
 * after the segment the user typed.
 * @param path Category path of the product, one entry per level.
 * @returns Slash joined folder names under the products folder.
 */
function toCategoryFolder(path: string[]): string {
  const chain = path.map(
    (segment, position) => toSlug(segment) || `category-${position + 1}`,
  );
  return [PRODUCTS_FOLDER, ...chain].join("/");
}

/**
 * Builds every file path of one product: one file inside its category folder
 * chain per category the product belongs to, so products with several
 * categories appear in each one of them. Exported because the file tree
 * preview of the editor reuses the exact same path computation.
 * @param product Normalized product.
 * @param fallbackNumber Number used in the fallback file name when no
 * alphanumeric character remains: the 1-based catalog position in the export
 * and the product id in the editor preview.
 * @param format Export format, which contributes the file extension.
 * @returns File paths of the product, in stable order.
 */
export function toProductPaths(
  product: Product,
  fallbackNumber: number,
  format: ExportFormat = defaultExportFormat,
): string[] {
  const fileName = toProductFileName(product, fallbackNumber, format);
  return product.categories.length === 0
    ? [`${PRODUCTS_FOLDER}/${fileName}`]
    : product.categories.map((path) => `${toCategoryFolder(path)}/${fileName}`);
}

/**
 * Builds the whole configuration package as a path/content map: the site
 * configuration file first, then one product file inside its category folder
 * chain per catalog entry.
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
    for (const path of toProductPaths(product, index + 1, format)) {
      files[path] = format.serialize(toProductDocument(product));
    }
  });
  return files;
}
