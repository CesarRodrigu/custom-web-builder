/**
 * Persistence contract of the editor draft.
 *
 * The stored document is untrusted data: it may be missing, older than the
 * current fields, or written while the form was still half filled. The stored
 * schema is the deep partial of a rule-free shape, so no editing rule can
 * discard a stored value. The adapter completes the missing fields before the
 * draft reaches the editor.
 */
import { z } from "astro/zod";

import { siteConfigDraftShape } from "./config";
import type { SiteConfigDraft } from "./config";

/** localStorage key under which the editor draft is persisted. */
export const DRAFT_STORAGE_KEY = "custom-web-builder:draft";

/**
 * Zod schema of the stored draft content: the deep partial of
 * `siteConfigDraftShape`.
 *
 * Unlike `partial`, `deepPartial` walks into nested objects and into the
 * objects of every array, so a stored document may omit any field at any level
 * and still load back. No validation rule is applied here; the adapter
 * completes the missing values before handing the draft to the editor.
 */
export const storedDraftSchema = z.deepPartial(siteConfigDraftShape);

/** Document the structural schema reads back, with any field absent. */
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
