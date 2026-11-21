/**
 * Shared fixtures for the unit tests: builders of draft and normalized
 * configurations, so every test states only the fields it checks.
 */
import {
  BLANK_PRICE,
  type Category,
  type CategoryDraft,
  type Product,
  type ProductDraft,
  type SiteConfig,
  type SiteConfigDraft,
  type SiteMeta,
  type SiteMetaDraft,
} from "@/lib/catalog/schema";

/** Product fields shared by the fixtures, without the editor-only identity fields. */
const EMPTY_PRODUCT: Omit<ProductDraft, "id" | "sku" | "skuAuto"> = {
  name: "",
  categories: [],
  folder: "",
  shortDescription: "Descripción breve",
  price: BLANK_PRICE,
  mainImage: "",
  images: [],
};

/**
 * Builds a product draft out of partial overrides, so tests only specify the
 * fields under check.
 * @param overrides Partial product draft merged over an empty valid base.
 * @returns A complete product draft ready to be validated or persisted.
 */
export function productWith(
  overrides: Partial<ProductDraft> = {},
): ProductDraft {
  const id = overrides.id ?? 1;
  return {
    id,
    ...EMPTY_PRODUCT,
    sku: `SKU-ITEM-${String(id).padStart(3, "0")}`,
    skuAuto: false,
    ...overrides,
  };
}

/**
 * Builds a normalized product out of partial overrides, so tests only specify
 * the fields under check.
 * @param overrides Partial normalized product merged over a minimal base.
 * @returns A complete normalized product ready to be exported.
 */
export function normalizedProductWith(
  overrides: Partial<Product> = {},
): Product {
  return {
    sku: "SKU-ITEM-001",
    name: "",
    categories: [],
    price: 0,
    shortDescription: "Descripción breve",
    mainImage: "",
    images: [],
    ...overrides,
  };
}

/**
 * Builds a category draft out of partial overrides, so tests only specify the
 * fields under check.
 * @param overrides Partial category draft merged over an empty valid base.
 * @returns A complete category draft ready to be validated or persisted.
 */
export function categoryWith(
  overrides: Partial<CategoryDraft> = {},
): CategoryDraft {
  return {
    id: 1,
    name: "",
    description: "",
    ...overrides,
  };
}

/**
 * Builds a site configuration draft out of partial overrides, merging the
 * nested site metadata, so tests only specify the fields under check.
 * @param overrides Partial draft merged over a valid base.
 * @param overrides.site Partial site metadata merged over the base site.
 * @param overrides.folders Folder paths of the draft; defaults to none.
 * @param overrides.products Products of the draft; defaults to an empty catalog.
 * @param overrides.categories Categories of the draft; defaults to an empty list.
 * @returns A complete site configuration draft ready to be validated.
 */
export function draftWith(
  overrides: {
    site?: Partial<SiteMetaDraft>;
    folders?: string[];
    products?: ProductDraft[];
    categories?: CategoryDraft[];
  } = {},
): SiteConfigDraft {
  const base: SiteConfigDraft = {
    site: {
      name: "Panadería María",
      description: "",
      contactEmail: "",
    },
    folders: [],
    products: [],
    categories: [],
  };
  return {
    site: { ...base.site, ...overrides.site },
    folders: overrides.folders ?? base.folders,
    products: overrides.products ?? base.products,
    categories: overrides.categories ?? base.categories,
  };
}

/**
 * Builds a normalized site configuration out of partial overrides, merging the
 * nested site metadata, so tests only specify the fields under check.
 * @param overrides Partial configuration merged over a valid base.
 * @param overrides.site Partial site metadata merged over the base site.
 * @param overrides.folders Folder paths of the configuration; defaults to none.
 * @param overrides.products Products of the configuration; defaults to none.
 * @param overrides.categories Categories of the configuration; defaults to none.
 * @returns A complete normalized configuration ready to be exported.
 */
export function siteConfigWith(
  overrides: {
    site?: Partial<SiteMeta>;
    folders?: string[];
    products?: Product[];
    categories?: Category[];
  } = {},
): SiteConfig {
  return {
    site: {
      name: "Panadería María",
      description: "",
      contactEmail: "",
      ...overrides.site,
    },
    folders: overrides.folders ?? [],
    products: overrides.products ?? [],
    categories: overrides.categories ?? [],
  };
}
