/**
 * Sidebar of the configuration editor: the site name header and the
 * configuration package rendered as a collapsible file tree, mirroring what
 * the ZIP export contains and jumping to the page behind each file row. The
 * products folder carries the add product and add folder actions, every user
 * folder can get a subfolder or be deleted, and product files can be dragged
 * onto a folder to move them.
 */
import { PackageOpen } from "lucide-react";
import TreeViewNode from "@/features/builder/layout/TreeViewNode";
import type { BuilderTexts } from "@/features/builder/builder-texts";
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { siteName } from "@/config/site";
import { FileTreeNodeType, type FileTreeNode } from "@/lib/catalog/tree";

/** Props of the editor sidebar. */
interface EditorSidebarProps {
  /** Localized strings; the only difference between locales. */
  texts: BuilderTexts;
  /** File tree of the current draft package, rebuilt on every keystroke. */
  fileTree: FileTreeNode[];
  /** Whether the catalog holds at least one product yet. */
  hasProducts: boolean;
  /** Catalog position of the product the current section shows, or `undefined` when a product is not selected. */
  selectedProductIndex: number | undefined;
  /** Position of the category the current section shows, or `undefined` when no category is selected. */
  selectedCategoryIndex: number | undefined;
  /** Whether the site configuration has any validation error. */
  siteHasError: boolean;
  /** Catalog positions of the products with at least one validation error. */
  productsWithErrors: ReadonlySet<number>;
  /** Positions of the categories with at least one field with an error. */
  categoriesWithErrors: ReadonlySet<number>;
  /** Called with the node when the user selects a file tree row. */
  onSelectFileNode: (node: FileTreeNode) => void;
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
 * Renders the editor sidebar: the site name, the file tree with all its row
 * actions and an empty state message while the catalog has no products.
 * @param props Sidebar settings and the callbacks it needs.
 * @returns The sidebar markup.
 */
export function EditorSidebar(props: Readonly<EditorSidebarProps>) {
  const {
    texts,
    fileTree,
    hasProducts,
    selectedProductIndex,
    selectedCategoryIndex,
    siteHasError,
    productsWithErrors,
    categoriesWithErrors,
    onSelectFileNode,
    onAddProduct,
    onAddCategory,
    onDeleteProduct,
    onDeleteCategory,
    onAddFolder,
    onDeleteFolder,
    onMoveProduct,
  } = props;

  return (
    <Sidebar>
      <SidebarHeader>
        <span className="px-2 py-1.5 text-base font-semibold">{siteName}</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="flex flex-col">
              {fileTree.map((node) => (
                <TreeViewNode
                  key={
                    node.type === FileTreeNodeType.File &&
                    node.productId !== undefined
                      ? `product-${node.productId}:${node.path}`
                      : node.path
                  }
                  node={node}
                  selectedProductIndex={selectedProductIndex}
                  selectedCategoryIndex={selectedCategoryIndex}
                  onSelect={onSelectFileNode}
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
            </div>
            {!hasProducts && (
              <Empty className="mt-2 border">
                <EmptyMedia variant="icon">
                  <PackageOpen />
                </EmptyMedia>
                <EmptyDescription>
                  {texts.sidebarProductsEmpty}
                </EmptyDescription>
              </Empty>
            )}
            {hasProducts && (
              <p className="px-2 pt-2 text-xs text-muted-foreground">
                {texts.sidebarDragHint}
              </p>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default EditorSidebar;
