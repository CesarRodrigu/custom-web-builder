/**
 * Web storage implementation of the {@link DraftPersistence} port.
 *
 * The draft lives as one JSON document under a fixed `localStorage` key. The
 * storage is read defensively: it can be missing (server render), disabled,
 * or full, and the stored content is untrusted data, so every access
 * degrades into "there was nothing stored" without ever reaching the editing
 * flow.
 *
 * The structural Zod schema of the stored document and the storage key are
 * defined once in the shared catalog model. The draft being edited may be
 * half filled, so that schema only checks that every field is the text-like
 * shape the editor reads back. It accepts products without an id — the shape
 * stored before ids existed — and the load fills the missing ids in, so older
 * drafts upgrade in place instead of being discarded.
 */
import type { SiteConfigDraft } from "@/lib/catalog/schema";
import type { DraftPersistence } from "@/lib/catalog/persistence/types";
import {
  DRAFT_STORAGE_KEY,
  storedDraftSchema,
  type StoredDraft,
} from "@custom-web-builder/shared/catalog-schema";

export { DRAFT_STORAGE_KEY } from "@custom-web-builder/shared/catalog-schema";

/** The Storage subset the adapter uses; `null` when there is no backing document. */
type WebStorage = Pick<Storage, "getItem" | "setItem"> | null;

/**
 * Completes a stored draft so every product carries an id: ids already
 * stored are kept, and products without one (drafts saved before ids
 * existed) receive the next ids above the highest one found, so no id is
 * ever reused.
 * @param stored Draft read from the storage, with optional product ids.
 * @returns The same draft with every product carrying a valid id.
 */
function withStoredProductIds(stored: StoredDraft): SiteConfigDraft {
  let nextId = stored.products.reduce(
    (max, product) => Math.max(max, product.id ?? 0),
    0,
  );
  return {
    site: stored.site,
    products: stored.products.map((product) => ({
      ...product,
      id: product.id ?? ++nextId,
    })),
  };
}

/**
 * Builds the web storage persistence: the adapter satisfies the whole port
 * over one `getItem`/`setItem` box. The storage defaults to the browser's
 * `localStorage`, available only on the client; passing one enables fakes in
 * tests.
 * @param storage Web storage to read and write through; it defaults to the
 * client `localStorage`, resolving to `null` on the server render.
 * @returns The persistence loaded with the given storage.
 */
export function createWebStorageDraftPersistence(
  storage: WebStorage = typeof window === "undefined"
    ? null
    : window.localStorage,
): DraftPersistence {
  const loadDraft = (): SiteConfigDraft | undefined => {
    if (storage === null) return undefined;

    let raw: string | null;

    try {
      raw = storage.getItem(DRAFT_STORAGE_KEY);
    } catch {
      return undefined;
    }

    if (raw === null) return undefined;

    try {
      const result = storedDraftSchema.safeParse(JSON.parse(raw));
      return result.success ? withStoredProductIds(result.data) : undefined;
    } catch {
      return undefined;
    }
  };

  const saveDraft = (draft: SiteConfigDraft): void => {
    if (storage === null) return;

    try {
      storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Persisting is best effort on purpose: editing continues without it.
    }
  };

  return {
    load: () => Promise.resolve(loadDraft()),
    save: (draft) => {
      saveDraft(draft);
      return Promise.resolve();
    },
  };
}
