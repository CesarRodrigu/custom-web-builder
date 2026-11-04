/**
 * File tree preview of the configuration package.
 *
 * The editor sidebar mirrors the export: the same pure path computation used
 * to build the ZIP (`toProductPaths`) feeds a generic folder/file tree, so
 * what the user navigates on screen is exactly what the export produces,
 * regardless of whether the current draft is still valid. The one intentional
 * difference is the fallback file name of a product whose name has no slug:
 * the preview numbers it with the stable product id (so deleting a product
 * never shifts the names below it) while the export uses the catalog
 * position of the validated configuration.
 */
import { SITE_FILE, toProductPaths } from "@/lib/export/package";
import {
  toCategorySegments,
  type Product,
  type SiteConfigDraft,
} from "@/lib/catalog/schema";

/** One folder of the package tree, expandable in the sidebar. */
export interface FolderNode {
  /** Node discriminator. */
  type: "folder";
  /** Display name of the folder, e.g. `tartas`. */
  name: string;
  /** Package path of the folder, e.g. `products/dulces/tartas`. */
  path: string;
  /** Children of the folder, in stable order. */
  children: FileTreeNode[];
}

/** One file of the package tree, selectable in the sidebar. */
export interface FileNode {
  /** Node discriminator. */
  type: "file";
  /** Display name of the file, e.g. `tarta-de-manzana.json`. */
  name: string;
  /** Package path of the file, e.g. `products/dulces/tartas/tarta.json`. */
  path: string;
  /** Catalog position of the product behind the file, or undefined when the file is not a product file (the site file). */
  productIndex?: number;
  /**
   * Incremental id of the product behind the file, or undefined when the
   * file is not a product file; the sidebar keys its rows by it so a row
   * keeps its identity when another product shifts the catalog positions.
   */
  productId?: number;
}

/** Any node of the package tree: either a folder or a file. */
export type FileTreeNode = FolderNode | FileNode;

/** Package path and display name of the products folder, the tree root that holds every product file. */
export const PRODUCTS_FOLDER = "products";

/**
 * Inserts one package path into a folder tree, creating the nested folder
 * chain on the way and placing the file in the final folder.
 * @param folder Folder to insert the path into.
 * @param segments Path segments below `folder` (folder names plus file name).
 * @param path Full package path, kept as the file identity.
 * @param productIndex Catalog position of the product behind the file.
 * @param productId Incremental id of the product behind the file.
 */
function insertPath(
  folder: FolderNode,
  segments: string[],
  path: string,
  productIndex: number,
  productId: number,
): void {
  const [head, ...rest] = segments;
  if (rest.length === 0) {
    folder.children.push({
      type: "file",
      name: toFileNodeName(head),
      path,
      productIndex,
      productId,
    });
    return;
  }
  let child = folder.children.find(
    (node): node is FolderNode => node.type === "folder" && node.name === head,
  );
  if (!child) {
    child = {
      type: "folder",
      name: head,
      path: `${folder.path}/${head}`,
      children: [],
    };
    folder.children.push(child);
  }
  insertPath(child, rest, path, productIndex, productId);
}

/**
 * Builds the display name of one file node: the file name without its
 * `.json` extension, since the tree is a navigation preview rather than a
 * copy of the package contents.
 * @param fileName File name of the package, like `tarta-de-manzana.json`.
 * @returns Display name without the extension, like `tarta-de-manzana`.
 */
function toFileNodeName(fileName: string): string {
  return fileName.replace(/\.json$/, "");
}

/**
 * Builds the file tree of the current draft package: the site file first and
 * the products folder second, with one file per product file path (so a
 * product in several categories appears in each of its category chains).
 * @param draft Current configuration draft, valid or not.
 * @returns The tree nodes, in build order, ready to be rendered recursively.
 */
export function buildFileTree(draft: SiteConfigDraft): FileTreeNode[] {
  const productsFolder: FolderNode = {
    type: "folder",
    name: PRODUCTS_FOLDER,
    path: PRODUCTS_FOLDER,
    children: [],
  };
  draft.products.forEach((product, index) => {
    const productFile: Product = {
      name: product.name,
      categories: product.categories.map(toCategorySegments),
      price: 0,
    };
    for (const path of toProductPaths(productFile, product.id)) {
      insertPath(
        productsFolder,
        path.split("/").slice(1),
        path,
        index,
        product.id,
      );
    }
  });
  return [
    { type: "file", name: toFileNodeName(SITE_FILE), path: SITE_FILE },
    productsFolder,
  ];
}
