/**
 * Section navigation of the configuration editor.
 *
 * The editor shows one page at a time: the site configuration, one product
 * page or the export page. This module holds the section model plus the
 * helpers shared by every navigation entry: the stable dependency key, the
 * DOM ids of the page inputs and the focus jump.
 */
import type { ProductDraft, SiteMetaDraft } from "@/lib/catalog/schema";

/** Section currently open on the main area of the editor. */
export type EditorSection =
  | {
      /** The site configuration page. */
      kind: "config";
    }
  | {
      /** One product page, by position within the catalog. */
      kind: "product";
      index: number;
    }
  | {
      /** The export page, where the format is chosen and the download starts. */
      kind: "export";
    };

/**
 * Converts a section into a stable value usable inside effect dependencies.
 * @param section Section object.
 * @returns String identifier of the section and its index.
 */
export function toSectionKey(section: EditorSection): string {
  return section.kind === "product" ? `product-${section.index}` : section.kind;
}

/**
 * DOM id of a site input, so its label can point at it and tests can select it.
 * @param field Site draft field of the input.
 * @returns The input id, like `site-name`.
 */
export function siteInputId(field: keyof SiteMetaDraft): string {
  return `site-${field}`;
}

/**
 * DOM id of a product input, so its label can point at it and tests can select it.
 * @param index Position of the product within the catalog.
 * @param field Product draft field of the input.
 * @returns The input id, like `product-0-name`.
 */
export function productInputId(
  index: number,
  field: keyof ProductDraft,
): string {
  return `product-${index}-${field}`;
}

/**
 * Moves the focus to one input of the current page, scrolling it into view;
 * this is what section navigation does when the user selects an entry.
 * @param id DOM id of the target input.
 */
export function goTo(id: string): void {
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "start" });
  element.focus({ preventScroll: true });
}
