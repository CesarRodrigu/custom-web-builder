/**
 * Site metadata contract of the configuration package and of the editor that
 * writes it.
 *
 * The generator writes this document as `site.json` (or `site.yaml`) and the
 * front-end reads it back. One schema describes the metadata in both places:
 * the writer, the editor and the storage all validate against this definition.
 * The optional fields of older exports are part of the same shape, so adding a
 * field here reaches every consumer at once.
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
 * Zod schema of the site metadata, shared by the editor and the exported
 * package.
 *
 * `name` is required and reported with the stable `Required` code. The other
 * fields are optional because the exporter omits blank values and older
 * packages may not have them; the editor always writes them as text, including
 * when blank. Every rule emits a `ValidationCode` as its issue message, so the
 * editor can localize it without inspecting the rule.
 */
export const siteMetaSchema = z.object({
  /** Display name of the generated site; required. */
  name: z.string().refine(isFilled, ValidationCode.Required),
  /** Free text describing the business, when provided. */
  description: z.string().optional(),
  /** Contact email shown on the generated site; blank or a valid address. */
  contactEmail: z
    .string()
    .refine(isBlankOrEmail, ValidationCode.Email)
    .optional(),
});

/** Site metadata document the generator exports as `site.json`. */
export type SiteMeta = z.input<typeof siteMetaSchema>;

/** Site metadata as edited in the form: the same document, always with text fields. */
export type SiteMetaDraft = SiteMeta & {
  /** Free text describing the business; blank while editing. */
  description: string;
  /** Contact email shown on the site; blank while editing. */
  contactEmail: string;
};

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
