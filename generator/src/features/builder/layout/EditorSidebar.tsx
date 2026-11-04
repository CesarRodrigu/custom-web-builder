/**
 * Sidebar of the configuration editor: the site name header and the
 * configuration package rendered as a collapsible file tree, mirroring what
 * the ZIP export contains and jumping to the page behind each file row. The
 * products folder carries the add product action and every product row a
 * delete action revealed on hover.
 */
import type { ReactNode } from "react";
import { PackageOpen, Plus, Trash2 } from "lucide-react";
import TreeViewNode from "@/features/builder/layout/TreeViewNode";
import type { BuilderTexts } from "@/features/builder/builder-texts";
import RemoveProductButton from "@/features/builder/components/RemoveProductButton";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { siteName } from "@/config/site";
import { PRODUCTS_FOLDER, type FileTreeNode } from "@/lib/catalog/tree";

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
  /** Whether the site configuration has any validation error. */
  siteHasError: boolean;
  /** Catalog positions of the products with at least one validation error. */
  productsWithErrors: ReadonlySet<number>;
  /** Called with the node when the user selects a file tree row. */
  onSelectFileNode: (node: FileTreeNode) => void;
  /** Called when the user requests one more empty product. */
  onAddProduct: () => void;
  /** Called when the user deletes one product from its file tree row. */
  onDeleteProduct: (productIndex: number) => void;
}

/**
 * Renders the editor sidebar: the site name and the file tree of the
 * configuration package, with the add product action on the products folder,
 * the delete action on each product row and an empty state message while the
 * catalog has no products.
 * @param props Sidebar settings and the callbacks it needs.
 * @returns The sidebar markup.
 */
export function EditorSidebar(props: EditorSidebarProps) {
  const {
    texts,
    fileTree,
    hasProducts,
    selectedProductIndex,
    siteHasError,
    productsWithErrors,
    onSelectFileNode,
    onAddProduct,
    onDeleteProduct,
  } = props;

  /**
   * Builds the trailing action of one tree row: the add product button on
   * the products folder, the remove product confirmation on each product
   * file, and nothing on the site file or the category folders.
   * @param node Row being rendered.
   * @returns The row action, when the row has one.
   */
  function renderRowAction(node: FileTreeNode): ReactNode {
    if (node.type === "file") {
      const productIndex = node.productIndex;
      if (productIndex === undefined) return undefined;
      return (
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
      );
    }
    if (node.path !== PRODUCTS_FOLDER) return undefined;
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        title={texts.addProduct}
        onClick={onAddProduct}
      >
        <Plus />
        <span className="sr-only">{texts.addProduct}</span>
      </Button>
    );
  }

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
                    node.type === "file" && node.productId !== undefined
                      ? `product-${node.productId}:${node.path}`
                      : node.path
                  }
                  node={node}
                  selectedProductIndex={selectedProductIndex}
                  onSelect={onSelectFileNode}
                  siteHasError={siteHasError}
                  productsWithErrors={productsWithErrors}
                  renderRowAction={renderRowAction}
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
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default EditorSidebar;
