/**
 * Configuration contract shared by the editor and the exported package.
 *
 * The draft is what the user edits, the configuration is the normalized result
 * the generator exports. Both live here with their Zod schemas so a field added
 * to the model has one definition for every consumer of the workspace.
 */
import { z } from "astro/zod";

import type { Category, CategoryDraft } from "./category";
import { categoryDraftSchema, categoryDraftShape } from "./category";
import type { FieldIssue } from "./validation";
import { ValidationCode, isValidFolderPath } from "./validation";
import type { Product, ProductDraft } from "./product";
import {
  isMainImageConsistent,
  productDraftSchema,
  productDraftShape,
} from "./product";
import type { SiteMeta } from "./site";
import { siteMetaSchema, siteMetaShape } from "./site";

/** Raw site configuration as edited in the form, before normalization. */
export interface SiteConfigDraft {
  /** Site metadata draft. */
  site: SiteMeta;
  /** User created folder paths below `products/`, including their ancestors. */
  folders: string[];
  /** Products of the catalog, possibly empty while the user adds entries. */
  products: ProductDraft[];
  /** Categories of the catalog, possibly empty while the user adds entries. */
  categories: CategoryDraft[];
}

/**
 * Properties of the whole draft configuration, with their types and no
 * validation rules.
 *
 * The full draft applies the rules to this shape and the stored draft derives
 * its partial from it, so the property list is defined once.
 */
export const siteConfigDraftShape = z.object({
  /** Site metadata draft. */
  site: siteMetaShape,
  /** User created folder paths. */
  folders: z.array(z.string()),
  /** Products of the catalog. */
  products: z.array(productDraftShape),
  /** Categories of the catalog. */
  categories: z.array(categoryDraftShape),
});

/**
 * Zod schema of the whole draft configuration.
 *
 * It applies the rules to `siteConfigDraftShape`, reusing the single product
 * and category draft schemas so every rule of the editor lives next to the
 * document it extends. This schema only adds the folder rule and the rules
 * that compare rows with each other.
 */
export const siteConfigDraftSchema = siteConfigDraftShape
  .extend({
    /** Site metadata draft. */
    site: siteMetaSchema,
    /** User created folder paths, each a safe slash separated path. */
    folders: z.array(
      z.string().refine(isValidFolderPath, ValidationCode.Folder),
    ),
    /** Products of the catalog, possibly empty. */
    products: z.array(productDraftSchema),
    /** Categories of the catalog, possibly empty. */
    categories: z.array(categoryDraftSchema),
  })
  .superRefine((draft, context) => {
    draft.products.forEach((product, index) => {
      if (!isMainImageConsistent(product)) {
        context.addIssue({
          code: "custom",
          message: ValidationCode.MainImage,
          path: ["products", index, "mainImage"],
        });
      }
    });

    const categoryNameCounts = new Map<string, number>();
    for (const category of draft.categories) {
      const name = category.name.trim().toLowerCase();
      if (name === "") continue;
      categoryNameCounts.set(name, (categoryNameCounts.get(name) ?? 0) + 1);
    }
    draft.categories.forEach((category, index) => {
      const name = category.name.trim().toLowerCase();
      if (name !== "" && (categoryNameCounts.get(name) ?? 0) > 1) {
        context.addIssue({
          code: "custom",
          message: ValidationCode.DuplicateCategory,
          path: ["categories", index, "name"],
        });
      }
    });
  });

/** The declarative document the generator consumes and the front-end reads. */
export interface SiteConfig {
  /** Normalized site metadata. */
  site: SiteMeta;
  /** Normalized folder paths below `products/`, possibly empty. */
  folders: string[];
  /** Normalized products of the catalog, possibly empty. */
  products: Product[];
  /** Normalized categories of the catalog, possibly empty. */
  categories: Category[];
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
