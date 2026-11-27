/**
 * File tree preview of the configuration package.
 *
 * The editor sidebar mirrors the export: the same pure path computation used
 * to build the ZIP (`toProductPaths`) feeds a generic folder/file tree, so
 * what the user navigates on screen is exactly what the export produces,
 * regardless of whether the current draft is still valid. Folders created by
 * the user appear under `products/` even while empty, and a product dropped
 * into one is shown inside it. Generated category documents appear under a
 * `categories/` folder with the same ids the export writes. The one intentional difference is the fallback
 * file name of a product whose name has no slug: the preview numbers it with
 * the stable product id (so deleting a product never shifts the names below
 * it) while the export uses the catalog position of the validated
 * configuration.
 */
import { defaultExportFormat } from "@/lib/export/formats/format";
import {
  CATEGORIES_FOLDER,
  PRODUCTS_FOLDER,
  SITE_FILE,
  buildCategoryDocuments,
  toProductPaths,
} from "@/lib/export/package";
import type { Product, SiteConfigDraft } from "@/lib/catalog/schema";

/** Kinds of node of the package tree. */
export const FileTreeNodeType = {
  /** Expandable folder that holds other nodes. */
  Folder: "folder",
  /** Selectable file that opens the page behind it. */
  File: "file",
} as const;

/** Kind of node of the package tree. */
export type FileTreeNodeType =
  (typeof FileTreeNodeType)[keyof typeof FileTreeNodeType];

/** One folder of the package tree, expandable in the sidebar. */
export interface FolderNode {
  /** Node discriminator. */
  type: typeof FileTreeNodeType.Folder;
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
  type: typeof FileTreeNodeType.File;
  /** Display name of the file, e.g. `tarta-de-manzana.json`. */
  name: string;
  /** Package path of the file, e.g. `products/t/tarta.json`. */
  path: string;
  /** Catalog position of the product behind the file, or undefined when the file is not a product file (the site file). */
  productIndex?: number;
  /**
   * Incremental id of the product behind the file, or undefined when the
   * file is not a product file; the sidebar keys its rows by it so a row
   * keeps its identity when another product shifts the catalog positions.
   */
  productId?: number;
  /** Position of the category behind the file, or undefined when the file is not a category file. */
  categoryIndex?: number;
}

/** Any node of the package tree: either a folder or a file. */
export type FileTreeNode = FolderNode | FileNode;

/**
 * Inserts one package path into a folder tree, creating the nested folder
 * chain on the way and placing the file in the final folder.
 * @param folder Folder to insert the path into.
 * @param segments Path segments below `folder` (folder names plus file name).
 * @param path Full package path, kept as the file identity.
 * @param identity Position and id of the catalog entry the file opens, when it
 * opens a product or category page.
 */
function insertPath(
  folder: FolderNode,
  segments: string[],
  path: string,
  identity: Pick<FileNode, "productIndex" | "productId" | "categoryIndex"> = {},
): void {
  const [head, ...rest] = segments;
  if (rest.length === 0) {
    folder.children.push({
      type: FileTreeNodeType.File,
      name: toFileNodeName(head),
      path,
      ...identity,
    });
    return;
  }
  let child = folder.children.find(
    (node): node is FolderNode =>
      node.type === FileTreeNodeType.Folder && node.name === head,
  );
  if (!child) {
    child = {
      type: FileTreeNodeType.Folder,
      name: head,
      path: `${folder.path}/${head}`,
      children: [],
    };
    folder.children.push(child);
  }
  insertPath(child, rest, path, identity);
}

/**
 * Creates the folder chain of one user folder path, reusing the folders that
 * are already in the tree so a nested path never duplicates an ancestor.
 * @param folder Folder to insert the chain into.
 * @param segments Folder names below `folder`, in order.
 */
function insertFolderPath(folder: FolderNode, segments: string[]): void {
  const [head, ...rest] = segments;
  if (!head) return;
  let child = folder.children.find(
    (node): node is FolderNode =>
      node.type === FileTreeNodeType.Folder && node.name === head,
  );
  if (!child) {
    child = {
      type: FileTreeNodeType.Folder,
      name: head,
      path: `${folder.path}/${head}`,
      children: [],
    };
    folder.children.push(child);
  }
  if (rest.length > 0) insertFolderPath(child, rest);
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
 * the products folder second, with the user created folder chain and one file
 * per product in its assigned folder or at the root, and the generated category
 * documents in their own folder. Product folders never represent a category:
 * the category name also lives inside the product document.
 * @param draft Current configuration draft, valid or not.
 * @returns The tree nodes, in build order, ready to be rendered recursively.
 */
export function buildFileTree(draft: SiteConfigDraft): FileTreeNode[] {
  const productsFolder: FolderNode = {
    type: FileTreeNodeType.Folder,
    name: PRODUCTS_FOLDER,
    path: PRODUCTS_FOLDER,
    children: [],
  };
  draft.folders.forEach((path) =>
    insertFolderPath(productsFolder, path.split("/")),
  );

  const productFiles: Pick<Product, "name" | "folder" | "categories">[] =
    draft.products.map((product) => ({
      name: product.name,
      categories: product.categories.map((category) => category.trim()),
      folder: product.folder,
    }));
  draft.products.forEach((product, index) => {
    const productFile = productFiles[index];
    if (!productFile) return;
    for (const path of toProductPaths(productFile, product.id)) {
      insertPath(productsFolder, path.split("/").slice(1), path, {
        productIndex: index,
        productId: product.id,
      });
    }
  });

  const nodes: FileTreeNode[] = [
    {
      type: FileTreeNodeType.File,
      name: toFileNodeName(SITE_FILE),
      path: SITE_FILE,
    },
    productsFolder,
  ];

  const categoriesFolder: FolderNode = {
    type: FileTreeNodeType.Folder,
    name: CATEGORIES_FOLDER,
    path: CATEGORIES_FOLDER,
    children: [],
  };
  const indexByName = new Map(
    draft.categories.map((category, index) => [
      category.name.trim().toLowerCase(),
      index,
    ]),
  );
  const represented = new Set<number>();
  buildCategoryDocuments(
    productFiles,
    draft.categories,
    defaultExportFormat,
  ).forEach((category) => {
    const fileName = `${category.id}.${defaultExportFormat.fileExtension}`;
    const categoryIndex = indexByName.get(category.name.toLowerCase());
    if (categoryIndex !== undefined) represented.add(categoryIndex);
    insertPath(
      categoriesFolder,
      [fileName],
      `${CATEGORIES_FOLDER}/${fileName}`,
      categoryIndex === undefined ? {} : { categoryIndex },
    );
  });
  // A category with a blank name is invalid and never reaches the export, but
  // the preview still needs a row for it so the user can see and fix the error.
  draft.categories.forEach((category, index) => {
    if (category.name.trim() !== "" || represented.has(index)) return;
    const fileName = `category-${index + 1}.${defaultExportFormat.fileExtension}`;
    insertPath(
      categoriesFolder,
      [fileName],
      `${CATEGORIES_FOLDER}/${fileName}`,
      { categoryIndex: index },
    );
  });
  nodes.push(categoriesFolder);

  return nodes;
}
