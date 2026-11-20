/**
 * Configuration contract shared by the editor and the exported package.
 *
 * The draft is what the user edits, the configuration is the normalized result
 * the generator exports. Both live here with their Zod schemas so a field added
 * to the model has one definition for every consumer of the workspace.
 */
import { z } from "astro/zod";

import type { FieldIssue } from "./validation";
import { ValidationCode } from "./validation";
import type { Product, ProductDraft } from "./product";
import { productSchema } from "./product";
import type { SiteMeta, SiteMetaDraft } from "./site";
import { siteMetaSchema } from "./site";

/** Raw site configuration as edited in the form, before normalization. */
export interface SiteConfigDraft {
  /** Site metadata draft. */
  site: SiteMetaDraft;
  /** Products of the catalog, possibly empty while the user adds entries. */
  products: ProductDraft[];
}

/**
 * Zod schema of the whole draft configuration.
 *
 * It reuses the single product and site schemas and adds the one rule that
 * belongs to the editor rather than to the exported document: each row must
 * carry the id the editor uses to track it, even after a rename.
 */
export const siteConfigDraftSchema = z
  .object({
    /** Site metadata draft. */
    site: siteMetaSchema,
    /** Products of the catalog, possibly empty. */
    products: z.array(productSchema),
  })
  .superRefine((draft, context) => {
    draft.products.forEach((product, index) => {
      if (
        product.id === undefined ||
        !Number.isInteger(product.id) ||
        product.id <= 0
      ) {
        context.addIssue({
          code: "custom",
          message: ValidationCode.Required,
          path: ["products", index, "id"],
        });
      }
    });
  });

/** The declarative document the generator consumes and the front-end reads. */
export interface SiteConfig {
  /** Normalized site metadata. */
  site: SiteMeta;
  /** Normalized products of the catalog, possibly empty. */
  products: Product[];
}

/** Result of validating a draft: either the normalized configuration or its issues. */
export type SiteConfigValidation =
  | {
      /** The draft satisfies every schema rule. */
      valid: true;
      /** Normalized configuration, ready to be exported. */
      config: SiteConfig;
    }
  | {
      /** At least one field does not satisfy the schema. */
      valid: false;
      /** One issue per offending field, in schema order. */
      issues: FieldIssue[];
    };
