/**
 * Site metadata contract of the configuration package and of the editor that
 * writes it.
 *
 * The generator writes this document as `site.json` (or `site.yaml`) and the
 * front-end reads it back. One schema describes the metadata in both places:
 * the writer, the editor and the storage all validate against this definition,
 * so adding a field here reaches every consumer at once.
 */
import { z } from "astro/zod";

import { ValidationCode, isFilled } from "./validation";

/**
 * Reports whether a contact email is blank or a valid address.
 * @param value Raw contact email typed by the user or read from the package.
 * @returns True when the value is blank or parses as an email address.
 */
function isBlankOrEmail(value: string): boolean {
  return value.trim() === "" || z.email().safeParse(value.trim()).success;
}

/**
 * Properties of the site metadata, with their types and no validation rules.
 *
 * The full schema adds the editing rules to this shape and the stored draft
 * derives its partial from it, so one property list reaches every variant.
 */
export const siteMetaShape = z.object({
  /** Display name of the generated site. */
  name: z.string(),
  /** Free text describing the business. */
  description: z.string(),
  /** Contact email shown on the generated site. */
  contactEmail: z.string(),
});

/**
 * Zod schema of the site metadata, shared by the editor and the exported
 * package.
 *
 * It applies the editing rules to `siteMetaShape`. `name` is reported with the
 * stable `Required` code. `description` and `contactEmail` are always written,
 * blank allowed, so every consumer reads the same three fields. Every rule
 * emits a `ValidationCode` as its issue message, so the editor can localize it
 * without inspecting the rule.
 */
export const siteMetaSchema = siteMetaShape.extend({
  /** Display name of the generated site; required. */
  name: z.string().refine(isFilled, ValidationCode.Required),
  /** Contact email shown on the generated site; blank or a valid address. */
  contactEmail: z.string().refine(isBlankOrEmail, ValidationCode.Email),
});

/** Site metadata document the generator exports as `site.json`. */
export type SiteMeta = z.input<typeof siteMetaSchema>;

/**
 * Site metadata as edited in the form: the same document, always with text
 * fields, including when blank.
 */
export type SiteMetaDraft = SiteMeta;

/** Text fields of the site metadata that the editor edits with one input each. */
export const SiteTextField = {
  /** Display name of the generated site. */
  Name: "name",
  /** Free text describing the business. */
  Description: "description",
  /** Contact email shown on the site. */
  ContactEmail: "contactEmail",
} as const satisfies Record<string, keyof SiteMetaDraft>;

/** Text field of the site metadata that the editor edits with one input. */
export type SiteTextField = (typeof SiteTextField)[keyof typeof SiteTextField];
