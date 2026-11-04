/**
 * Port of the draft persistence: the contract every implementation satisfies
 * to move the editor draft across sessions.
 *
 * The port abstracts *where* the draft lives, never *what* a draft is: the
 * document is the `SiteConfigDraft` of the formal schema. Implementations
 * choose their backing store — browser storage today, a database later — by
 * adding a module under `persistence/` and returning it from the composition
 * root `draft-persistence.ts`; no caller changes.
 *
 * Both members are asynchronous and never reject, so the same contract
 * applies to immediate stores like `localStorage` and to remote ones.
 */
import type { SiteConfigDraft } from "@/lib/catalog/schema";

/** One draft persistence implementation, registered in `draft-persistence.ts`. */
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
