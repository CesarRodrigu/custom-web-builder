/**
 * Persistence contract of the editor draft.
 *
 * The stored document is untrusted data: it may be missing, older than the
 * editor-only product ids, or written while the form was still half filled.
 * Its product and site schemas therefore derive from the single schemas with
 * `partial`, and override the fields whose editing rules would reject an
 * unfinished draft with plain types.
 */
import { z } from "astro/zod";

import type { SiteConfigDraft } from "./config";
import { productSchema } from "./product";
import { siteMetaSchema } from "./site";

/** localStorage key under which the editor draft is persisted. */
export const DRAFT_STORAGE_KEY = "custom-web-builder:draft";

/**
 * Structural view of a stored product: every field of the product schema
 * becomes optional, and the fields with semantic rules are read back as plain
 * values so a blank name or an unfinished price does not discard the draft.
 */
const storedProductSchema = productSchema.partial().extend({
  /** Stored display name; blank is allowed while editing. */
  name: z.string(),
  /** Stored flat category names; unvalidated while editing. */
  categories: z.array(z.string()),
  /** Stored free text; blank is allowed while editing. */
  description: z.string(),
  /** Stored price; unvalidated while editing, including the blank sentinel. */
  price: z.number(),
  /** Stored image reference; blank or an unfinished value is allowed. */
  imageUrl: z.string(),
  /** Stored gallery; left absent instead of receiving the exported default. */
  images: z.array(z.string()).optional(),
});

/**
 * Structural view of the stored site metadata: every field is read back as
 * text, so a blank name or an unfinished email does not discard the draft.
 */
const storedSiteSchema = siteMetaSchema.partial().extend({
  /** Stored display name; blank is allowed while editing. */
  name: z.string(),
  /** Stored business description; blank is allowed while editing. */
  description: z.string(),
  /** Stored contact email; unvalidated while editing. */
  contactEmail: z.string(),
});

/**
 * Zod schema of the stored draft content: the structural shape of
 * `SiteConfigDraft`. Product ids are optional here because drafts stored
 * before ids existed are still valid input; the mapper of the adapter turns
 * the parsed document into a full `SiteConfigDraft`.
 */
export const storedDraftSchema = z.object({
  /** Stored site metadata, with every field as text. */
  site: storedSiteSchema,
  /** Stored products, possibly without an id. */
  products: z.array(storedProductSchema),
});

/** Document the structural schema reads back, with optional product ids. */
export type StoredDraft = z.infer<typeof storedDraftSchema>;

/** One draft persistence implementation, registered in the composition root. */
export interface DraftPersistence {
  /**
   * Reads the most recently saved draft back.
   * @returns A promise of the stored draft; it resolves to `undefined`
   * whenever nothing usable is stored — nothing yet, content the
   * implementation does not trust, or a backing store that is missing or
   * unreachable — so an unreadable draft always degrades to a fresh editing
   * session.
   */
  load(): Promise<SiteConfigDraft | undefined>;
  /**
   * Persists the draft, replacing whatever was stored before. Persistence is
   * best effort: implementations report their own failures and resolve even
   * when the write fails, so a broken store degrades to in memory editing
   * rather than interrupting it.
   * @param draft Draft to persist, valid or not: the implementation stores
   * whatever the editor is editing, so an unfinished form also survives a
   * reload.
   */
  save(draft: SiteConfigDraft): Promise<void>;
}
