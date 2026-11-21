/**
 * File tree node row of the configuration package.
 *
 * Renders one node of the package file tree, following the shadcn file tree
 * pattern: folders are collapsible ghosts with their children nested, and
 * files are ghost buttons that jump to the page behind them (product page or
 * site configuration). Product files can be dragged onto any folder, including
 * the products root, to change the folder they belong to. Folders also carry
 * the actions to create a nested folder and to delete a user created one.
 */
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type SubmitEvent,
} from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  File as FileIcon,
  Folder as FolderIcon,
  FolderPlus,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import type { BuilderTexts } from "@/features/builder/builder-texts";
import RemoveCategoryButton from "@/features/builder/components/RemoveCategoryButton";
import RemoveFolderButton from "@/features/builder/components/RemoveFolderButton";
import RemoveProductButton from "@/features/builder/components/RemoveProductButton";
import { cn } from "@/lib/utils";
import { FileTreeNodeType, type FileTreeNode } from "@/lib/catalog/tree";
import {
  CATEGORIES_FOLDER,
  PRODUCTS_FOLDER,
  toRelativeFolderPath,
} from "@/lib/export/package";

/** Props of one interactive file tree node row. */
export interface TreeViewNodeProps {
  /** Node being rendered. */
  node: FileTreeNode;
  /** Catalog position of the product the current section shows, or `undefined` when a product is not selected. */
  selectedProductIndex: number | undefined;
  /** Position of the category the current section shows, or `undefined` when no category is selected. */
  selectedCategoryIndex: number | undefined;
  /** Called with the node when the user selects a file row. */
  onSelect: (node: FileTreeNode) => void;
  /** Whether the site configuration has any validation error. */
  siteHasError: boolean;
  /** Catalog positions of the products that have at least one validation error. */
  productsWithErrors: ReadonlySet<number>;
  /** Positions of the categories that have at least one field with an error. */
  categoriesWithErrors: ReadonlySet<number>;
  /** Localized strings; the only difference between locales. */
  texts: BuilderTexts;
  /** Called with the relative folder path when the user adds a product to a folder. */
  onAddProduct: (folderPath: string) => void;
  /** Called when the user adds a category from the categories folder. */
  onAddCategory: () => void;
  /** Called when the user deletes one product from its file tree row. */
  onDeleteProduct: (productIndex: number) => void;
  /** Called when the user deletes one category from its file tree row. */
  onDeleteCategory: (categoryIndex: number) => void;
  /** Called with the parent path and the typed name when a folder is created. */
  onAddFolder: (parentPath: string, name: string) => void;
  /** Called with the folder path when a user created folder is deleted. */
  onDeleteFolder: (folderPath: string) => void;
  /** Called with the product id and the target path when a product is dropped. */
  onMoveProduct: (productId: number, folderPath: string) => void;
}

/**
 * Reports whether one tree node (or any of its descendants) has a validation
 * error, so folders containing an invalid file are also highlighted.
 * @param node Node being checked.
 * @param siteHasError Whether the site configuration has any validation error.
 * @param productsWithErrors Catalog positions of the products with errors.
 * @param categoriesWithErrors Positions of the categories with errors.
 * @returns True when the node or one of its descendants is invalid.
 */
function nodeHasError(
  node: FileTreeNode,
  siteHasError: boolean,
  productsWithErrors: ReadonlySet<number>,
  categoriesWithErrors: ReadonlySet<number>,
): boolean {
  if (node.type === FileTreeNodeType.File) {
    if (node.categoryIndex !== undefined) {
      return categoriesWithErrors.has(node.categoryIndex);
    }
    if (node.productIndex !== undefined) {
      return productsWithErrors.has(node.productIndex);
    }
    return siteHasError;
  }
  return node.children.some((child) =>
    nodeHasError(child, siteHasError, productsWithErrors, categoriesWithErrors),
  );
}

/**
 * Renders one node of the package file tree, including its row actions, its
 * inline new folder form and the drop target when the node is a folder.
 * @param props Node data, selection state, localized strings and callbacks.
 * @returns The node row element.
 */
export function TreeViewNode(props: Readonly<TreeViewNodeProps>) {
  const {
    node,
    selectedProductIndex,
    selectedCategoryIndex,
    onSelect,
    siteHasError,
    productsWithErrors,
    categoriesWithErrors,
    texts,
    onAddProduct,
    onAddCategory,
    onDeleteProduct,
    onDeleteCategory,
    onAddFolder,
    onDeleteFolder,
    onMoveProduct,
  } = props;
  const [isAdding, setIsAdding] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const invalid = nodeHasError(
    node,
    siteHasError,
    productsWithErrors,
    categoriesWithErrors,
  );

  useEffect(() => {
    if (isAdding) folderInputRef.current?.focus();
  }, [isAdding]);

  /**
   * Reads the dragged product id and assigns it to the folder behind this row.
   * @param event Drop event carrying the product id in its data transfer.
   */
  function handleDrop(event: DragEvent<HTMLElement>): void {
    event.preventDefault();
    setIsDragOver(false);
    const rawId = event.dataTransfer.getData("text/plain");
    const productId = Number(rawId);
    if (rawId !== "" && Number.isInteger(productId)) {
      onMoveProduct(productId, node.path);
    }
  }

  /**
   * Submits the typed name as a folder below this row, or at the products root
   * when this row is the products folder itself.
   * @param event Submit event of the inline folder form.
   */
  function submitFolder(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const name = folderName.trim();
    if (name === "") return;
    onAddFolder(node.path === PRODUCTS_FOLDER ? "" : node.path, name);
    setFolderName("");
    setIsAdding(false);
  }

  if (node.type === FileTreeNodeType.File) {
    const productIndex = node.productIndex;
    const categoryIndex = node.categoryIndex;
    const isProduct = productIndex !== undefined;
    const isCategory = categoryIndex !== undefined;
    const active = isCategory
      ? selectedCategoryIndex === categoryIndex
      : isProduct
        ? productIndex === selectedProductIndex
        : selectedProductIndex === undefined &&
          selectedCategoryIndex === undefined;
    return (
      <div className="group/file-row relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          draggable={isProduct}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", String(node.productId));
            event.dataTransfer.effectAllowed = "move";
          }}
          className={cn(
            "w-full justify-start",
            isProduct && "cursor-grab active:cursor-grabbing",
            active &&
              "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
            invalid && "text-destructive!",
            (isProduct || isCategory) && "pr-8",
          )}
          onClick={() => onSelect(node)}
        >
          <FileIcon />
          {node.name}
        </Button>
        {isProduct && (
          <span className="absolute inset-y-0 right-1 flex items-center">
            <RemoveProductButton
              texts={texts}
              onRemove={() => onDeleteProduct(productIndex)}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title={texts.deleteProduct}
                  className="text-destructive opacity-0 transition-opacity group-hover/file-row:opacity-100 group-focus-within/file-row:opacity-100 hover:text-destructive"
                >
                  <Trash2 />
                  <span className="sr-only">{texts.deleteProduct}</span>
                </Button>
              }
            />
          </span>
        )}
        {isCategory && (
          <span className="absolute inset-y-0 right-1 flex items-center">
            <RemoveCategoryButton
              texts={texts}
              onRemove={() => onDeleteCategory(categoryIndex)}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title={texts.deleteCategory}
                  className="text-destructive opacity-0 transition-opacity group-hover/file-row:opacity-100 group-focus-within/file-row:opacity-100 hover:text-destructive"
                >
                  <Trash2 />
                  <span className="sr-only">{texts.deleteCategory}</span>
                </Button>
              }
            />
          </span>
        )}
      </div>
    );
  }

  const isRoot = node.path === PRODUCTS_FOLDER;
  const isCategoriesRoot = node.path === CATEGORIES_FOLDER;
  const folderAction = isRoot ? texts.addFolder : texts.addSubfolder;
  const addProductLabel = isCategoriesRoot
    ? texts.addCategoryButton
    : isRoot
      ? texts.addProduct
      : texts.addProductToFolder.replace("{folder}", node.name);
  return (
    <Collapsible defaultOpen className="group/collapsible">
      <div
        className="group/file-row relative"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <CollapsibleTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start pr-20",
                invalid && "text-destructive! aria-expanded:text-destructive!",
                isDragOver &&
                  "bg-sidebar-accent ring-1 ring-sidebar-primary ring-inset",
              )}
            />
          }
        >
          <ChevronRight className="block group-aria-expanded/button:hidden" />
          <ChevronDown className="hidden group-aria-expanded/button:block" />
          <FolderIcon />
          {node.name}
        </CollapsibleTrigger>
        <span className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title={addProductLabel}
            onClick={() =>
              isCategoriesRoot
                ? onAddCategory()
                : onAddProduct(toRelativeFolderPath(node.path))
            }
          >
            <Plus />
            <span className="sr-only">{addProductLabel}</span>
          </Button>
          {!isCategoriesRoot && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                title={folderAction}
                aria-expanded={isAdding}
                onClick={() => setIsAdding((current) => !current)}
              >
                <FolderPlus />
                <span className="sr-only">{folderAction}</span>
              </Button>
              <RemoveFolderButton
                texts={texts}
                onRemove={() => onDeleteFolder(node.path)}
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    title={texts.deleteFolder}
                    disabled={isRoot}
                    className="text-destructive opacity-0 transition-opacity group-hover/file-row:opacity-100 group-focus-within/file-row:opacity-100 hover:text-destructive"
                  >
                    <Trash2 />
                    <span className="sr-only">{texts.deleteFolder}</span>
                  </Button>
                }
              />
            </>
          )}
        </span>
      </div>
      <CollapsibleContent className="ml-4 flex flex-col">
        {isAdding && (
          <form
            className="flex items-center gap-1 py-1"
            onSubmit={submitFolder}
          >
            <Input
              ref={folderInputRef}
              aria-label={folderAction}
              placeholder={texts.folderNamePlaceholder}
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              className="h-7"
            />
            <Button
              type="submit"
              variant="ghost"
              size="icon-xs"
              title={texts.createFolder}
            >
              <Check />
              <span className="sr-only">{texts.createFolder}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title={texts.cancelFolder}
              onClick={() => {
                setFolderName("");
                setIsAdding(false);
              }}
            >
              <X />
              <span className="sr-only">{texts.cancelFolder}</span>
            </Button>
          </form>
        )}
        {node.children.map((child, childIndex) => (
          <TreeViewNode
            key={`${child.path}-${childIndex}`}
            node={child}
            selectedProductIndex={selectedProductIndex}
            selectedCategoryIndex={selectedCategoryIndex}
            onSelect={onSelect}
            siteHasError={siteHasError}
            productsWithErrors={productsWithErrors}
            categoriesWithErrors={categoriesWithErrors}
            texts={texts}
            onAddProduct={onAddProduct}
            onAddCategory={onAddCategory}
            onDeleteProduct={onDeleteProduct}
            onDeleteCategory={onDeleteCategory}
            onAddFolder={onAddFolder}
            onDeleteFolder={onDeleteFolder}
            onMoveProduct={onMoveProduct}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default TreeViewNode;
