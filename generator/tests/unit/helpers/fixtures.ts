/**
 * Shared fixtures for the unit tests: builders of draft and normalized
 * configurations, so every test states only the fields it checks.
 */
import type {
  Product,
  ProductDraft,
  SiteConfig,
  SiteConfigDraft,
  SiteMeta,
  SiteMetaDraft,
} from "@/lib/catalog/schema";

/** Product fields shared by the fixtures, without the editor-only id. */
const EMPTY_PRODUCT: Omit<ProductDraft, "id"> = {
  name: "",
  categories: [],
  description: "",
  price: "",
  imageUrl: "",
};

/** Product shape persisted before editor-only ids existed. */
export type StoredProduct = Omit<ProductDraft, "id">;

/** Draft shape persisted before editor-only product ids existed. */
export interface StoredDraft {
  /** Stored site metadata. */
  site: SiteMetaDraft;
  /** Stored products, possibly without an id. */
  products: StoredProduct[];
}

/**
 * Builds a product draft out of partial overrides, so tests only specify the
 * fields under check.
 * @param overrides Partial product draft merged over an empty valid base.
 * @returns A complete product draft ready to be validated or persisted.
 */
export function productWith(
  overrides: Partial<ProductDraft> = {},
): ProductDraft {
  return { id: 1, ...EMPTY_PRODUCT, ...overrides };
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
  return { name: "", categories: [], price: 0, ...overrides };
}

/**
 * Builds the shape of a product persisted before editor-only ids existed.
 * @param overrides Partial product fields merged over an empty valid base.
 * @returns A stored product without an id.
 */
export function storedProductWith(
  overrides: Partial<StoredProduct> = {},
): StoredProduct {
  return { ...EMPTY_PRODUCT, ...overrides };
}

/**
 * Builds a site configuration draft out of partial overrides, merging the
 * nested site metadata, so tests only specify the fields under check.
 * @param overrides Partial draft merged over a valid base.
 * @param overrides.site Partial site metadata merged over the base site.
 * @param overrides.products Products of the draft; defaults to an empty catalog.
 * @returns A complete site configuration draft ready to be validated.
 */
export function draftWith(
  overrides: {
    site?: Partial<SiteMetaDraft>;
    products?: ProductDraft[];
  } = {},
): SiteConfigDraft {
  const base: SiteConfigDraft = {
    site: {
      name: "Panadería María",
      description: "",
      contactEmail: "",
    },
    products: [],
  };
  return {
    site: { ...base.site, ...overrides.site },
    products: overrides.products ?? base.products,
  };
}

/**
 * Builds the shape of a draft persisted before editor-only product ids existed.
 * @param products Stored products, possibly without an id.
 * @returns A stored draft document without editor-only product ids.
 */
export function storedDraftWith(products: StoredProduct[] = []): StoredDraft {
  return { site: draftWith().site, products };
}

/**
 * Builds a normalized site configuration out of partial overrides, merging the
 * nested site metadata, so tests only specify the fields under check.
 * @param overrides Partial configuration merged over a valid base.
 * @param overrides.site Partial site metadata merged over the base site.
 * @param overrides.products Products of the configuration; defaults to none.
 * @returns A complete normalized configuration ready to be exported.
 */
export function siteConfigWith(
  overrides: {
    site?: Partial<SiteMeta>;
    products?: Product[];
  } = {},
): SiteConfig {
  return {
    site: { name: "Panadería María", ...overrides.site },
    products: overrides.products ?? [],
  };
}
