/**
 * File tree node row of the configuration package.
 *
 * Renders one node of the package file tree, following the shadcn file tree
 * pattern: folders are collapsible ghosts with their children nested, and
 * files are ghost buttons that jump to the page behind them (product page or
 * site configuration). Any row can also render a trailing action built by
 * the parent, like the add product button on the products folder.
 */
import type { ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  File as FileIcon,
  Folder as FolderIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { FileTreeNodeType, type FileTreeNode } from "@/lib/catalog/tree";

/** Props of one interactive file tree node row. */
export interface TreeViewNodeProps {
  /** Node being rendered. */
  node: FileTreeNode;
  /** Catalog position of the product the current section shows, or `undefined` when a product is not selected. */
  selectedProductIndex: number | undefined;
  /** Called with the node when the user selects a file row. */
  onSelect: (node: FileTreeNode) => void;
  /** Whether the site configuration has any validation error. */
  siteHasError: boolean;
  /** Catalog positions of the products that have at least one validation error. */
  productsWithErrors: ReadonlySet<number>;
  /**
   * Builds the trailing action of this row, or `undefined` when the row has
   * none; the returned element is absolutely positioned at the row's end.
   */
  renderRowAction?: (node: FileTreeNode) => ReactNode;
}

/**
 * Reports whether one tree node (or any of its descendants) has a validation
 * error, so folders containing an invalid file are also highlighted.
 * @param node Node being checked.
 * @param siteHasError Whether the site configuration has any validation error.
 * @param productsWithErrors Catalog positions of the products with errors.
 * @returns True when the node or one of its descendants is invalid.
 */
function nodeHasError(
  node: FileTreeNode,
  siteHasError: boolean,
  productsWithErrors: ReadonlySet<number>,
): boolean {
  if (node.type === FileTreeNodeType.File) {
    if (node.productIndex === undefined) {
      return siteHasError;
    }
    return productsWithErrors.has(node.productIndex);
  }
  return node.children.some((child) =>
    nodeHasError(child, siteHasError, productsWithErrors),
  );
}

/**
 * Renders one node of the package file tree.
 * @param props Node data, selection state and selection callback.
 * @returns The node row element.
 */
export function TreeViewNode(props: Readonly<TreeViewNodeProps>) {
  const {
    node,
    selectedProductIndex,
    onSelect,
    siteHasError,
    productsWithErrors,
    renderRowAction,
  } = props;
  const invalid = nodeHasError(node, siteHasError, productsWithErrors);
  const rowAction = renderRowAction?.(node);
  if (node.type === FileTreeNodeType.File) {
    const active =
      node.productIndex === undefined
        ? selectedProductIndex === undefined
        : node.productIndex === selectedProductIndex;
    return (
      <div className="group/file-row relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start",
            active &&
              "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
            invalid && "text-destructive!",
            rowAction && "pr-8",
          )}
          onClick={() => onSelect(node)}
        >
          <FileIcon />
          {node.name}
        </Button>
        {rowAction && (
          <span className="absolute inset-y-0 right-1 flex items-center">
            {rowAction}
          </span>
        )}
      </div>
    );
  }
  return (
    <Collapsible defaultOpen className="group/collapsible">
      <div className="relative">
        <CollapsibleTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start",
                invalid && "text-destructive! aria-expanded:text-destructive!",
                rowAction && "pr-8",
              )}
            />
          }
        >
          <ChevronRight className="block group-aria-expanded/button:hidden" />
          <ChevronDown className="hidden group-aria-expanded/button:block" />
          <FolderIcon />
          {node.name}
        </CollapsibleTrigger>
        {rowAction && (
          <span className="absolute inset-y-0 right-1 flex items-center">
            {rowAction}
          </span>
        )}
      </div>
      <CollapsibleContent className="ml-4 flex flex-col">
        {node.children.map((child, childIndex) => (
          <TreeViewNode
            key={`${child.path}-${childIndex}`}
            node={child}
            selectedProductIndex={selectedProductIndex}
            onSelect={onSelect}
            siteHasError={siteHasError}
            productsWithErrors={productsWithErrors}
            renderRowAction={renderRowAction}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default TreeViewNode;
