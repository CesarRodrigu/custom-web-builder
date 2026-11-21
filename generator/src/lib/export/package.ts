/**
 * Configuration package: the export that mirrors on disk how a shop is
 * organized.
 *
 * The package is a file tree with one site configuration file, an optional
 * `folders` file and a `products` folder holding one document per product.
 * Products are placed in the folder the user chose in the editor tree, which
 * may be a nested path such as `dulces/tartas`; products without a folder sit
 * directly in `products/`. Categories never become product folders: they travel
 * inside every product document as a flat array and are also collected into one
 * document per distinct category under `categories/`. Each of those documents
 * carries a generated unique id, so the front-end can use it as the entry id of
 * its categories collection instead of deriving one from the file name. This
 * module builds the tree as a path/content map, independent of how it is later
 * delivered to the user.
 */
import { toSlug } from "@custom-web-builder/shared/web-metadata";
import {
  defaultExportFormat,
  type ExportFormat,
} from "@/lib/export/formats/format";
import {
  optionalField,
  type Category,
  type CategoryDocument,
  type Product,
  type SiteConfig,
} from "@/lib/catalog/schema";

/** Folder that holds every product document of the catalog. */
export const PRODUCTS_FOLDER = "products";

/** Folder that holds one document per generated category of the catalog. */
export const CATEGORIES_FOLDER = "categories";

/**
 * Converts a package path of the tree into a product folder path relative to
 * the products folder, so dragging a product never repeats the root segment.
 * @param path Package path of a tree folder, e.g. `products/dulces/tartas`.
 * @returns The relative folder path, or an empty string for the products root.
 */
export function toRelativeFolderPath(path: string): string {
  if (path === PRODUCTS_FOLDER) return "";
  return path.startsWith(`${PRODUCTS_FOLDER}/`)
    ? path.slice(PRODUCTS_FOLDER.length + 1)
    : path;
}

/** Name of the single configuration file of the site. */
export const SITE_FILE = "site.json";

/** Base name of the optional file that preserves the user created folders. */
export const FOLDERS_FILE = "folders";

/**
 * Splits a product into the fields its own file contains, keeping the flat
 * category names and dropping the optional fields that are blank. The SKU, the
 * main image and the gallery are always written.
 * @param product Normalized product.
 * @returns The JSON-ready content of the product file.
 */
function toProductDocument(product: Product): Product {
  return {
    sku: product.sku,
    name: product.name,
    price: product.price,
    categories: product.categories,
    shortDescription: product.shortDescription,
    ...optionalField("longDescription", product.longDescription),
    ...(product.stock === undefined ? {} : { stock: product.stock }),
    ...(product.status === undefined ? {} : { status: product.status }),
    mainImage: product.mainImage,
    images: product.images,
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
  product: Pick<Product, "name" | "folder">,
  fallbackNumber: number,
  format: ExportFormat,
): string {
  const base = toSlug(product.name) || `product-${fallbackNumber}`;
  return `${base}.${format.fileExtension}`;
}

/**
 * Builds the only file path of one product: one document in the folder the
 * user assigned to it, or directly in `products/` when it has none. The
 * categories it declares never change the path.
 * @param product Normalized product.
 * @param fallbackNumber Number used in the fallback file name.
 * @param format Export format, which contributes the file extension.
 * @returns The path of the product under the products folder.
 */
function toProductPath(
  product: Pick<Product, "name" | "folder">,
  fallbackNumber: number,
  format: ExportFormat,
): string {
  return [
    PRODUCTS_FOLDER,
    ...(product.folder ? [product.folder] : []),
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
  product: Pick<Product, "name" | "folder">,
  fallbackNumber: number,
  format: ExportFormat = defaultExportFormat,
): string[] {
  return [toProductPath(product, fallbackNumber, format)];
}

/**
 * Converts the package path of one product into the entry id the products
 * collection assigns to it, dropping the collection folder and the extension.
 * @param product Normalized product.
 * @param fallbackNumber Number used in the fallback file name.
 * @param format Export format, which contributes the file extension.
 * @returns Entry id such as `panes/baguette`.
 */
function toProductEntryId(
  product: Pick<Product, "name" | "folder">,
  fallbackNumber: number,
  format: ExportFormat,
): string {
  const path = toProductPath(product, fallbackNumber, format);
  const prefix = `${PRODUCTS_FOLDER}/`;
  const extension = `.${format.fileExtension}`;
  return path.slice(prefix.length, path.length - extension.length);
}

/**
 * Builds one document per category of the catalog, in editor order. Names that
 * differ only in case share a document and keep the first spelling; a category
 * used by a product but missing from the declared list is still exported, so a
 * half edited package never loses a membership. The id is the slug of
 * the name, or `category-<position>` when the name leaves no slug, with a
 * numeric suffix added when two names would otherwise produce the same id.
 * Product references are the entry ids of the products that declare the
 * category, in catalog order.
 * @param products Normalized products of the configuration.
 * @param categories Normalized categories of the configuration.
 * @param format Export format, used to derive the product entry ids.
 * @returns Category documents ready to be serialized into the package.
 */
export function buildCategoryDocuments(
  products: readonly Pick<Product, "name" | "folder" | "categories">[],
  categories: readonly Category[],
  format: ExportFormat,
): CategoryDocument[] {
  const byName = new Map<
    string,
    { name: string; description?: string; productIds: string[] }
  >();

  for (const category of categories) {
    const name = category.name.trim();
    if (name === "") continue;
    const description = category.description?.trim();
    byName.set(name.toLowerCase(), {
      name,
      ...(description ? { description } : {}),
      productIds: [],
    });
  }

  products.forEach((product, index) => {
    const productId = toProductEntryId(product, index + 1, format);
    for (const rawName of product.categories) {
      const name = rawName.trim();
      if (name === "") continue;
      const key = name.toLowerCase();
      let category = byName.get(key);
      if (!category) {
        category = { name, productIds: [] };
        byName.set(key, category);
      }
      if (!category.productIds.includes(productId)) {
        category.productIds.push(productId);
      }
    }
  });

  const usedIds = new Set<string>();
  return [...byName.values()].map(
    ({ name, description, productIds }, index) => {
      const base = toSlug(name) || `category-${index + 1}`;
      let id = base;
      let suffix = 2;
      while (usedIds.has(id)) {
        id = `${base}-${suffix}`;
        suffix += 1;
      }
      usedIds.add(id);
      return {
        id,
        name,
        ...(description ? { description } : {}),
        products: productIds,
      };
    },
  );
}

/**
 * Builds the whole configuration package as a path/content map: the site
 * configuration file, the folder list when the user created any folder, one
 * product document per catalog entry and one category document per distinct
 * category name.
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
  if (config.folders.length > 0) {
    files[`${FOLDERS_FILE}.${format.fileExtension}`] = format.serialize({
      folders: config.folders,
    });
  }
  config.products.forEach((product, index) => {
    files[toProductPath(product, index + 1, format)] = format.serialize(
      toProductDocument(product),
    );
  });
  buildCategoryDocuments(config.products, config.categories, format).forEach(
    (document) => {
      files[`${CATEGORIES_FOLDER}/${document.id}.${format.fileExtension}`] =
        format.serialize(document);
    },
  );
  return files;
}
