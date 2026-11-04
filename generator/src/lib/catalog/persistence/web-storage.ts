/**
 * Web storage implementation of the {@link DraftPersistence} port.
 *
 * The draft lives as one JSON document under a fixed `localStorage` key. The
 * storage is read defensively: it can be missing (server render), disabled,
 * or full, and the stored content is untrusted data, so every access
 * degrades into "there was nothing stored" without ever reaching the editing
 * flow.
 *
 * The trust boundary is a purely structural Zod schema: the draft being
 * edited may be half filled, so the schema only checks that every field is
 * the text-like shape the editor reads back, never that the draft satisfies
 * the semantic rules of the formal schema (that is `siteConfigDraftSchema`
 * in `lib/catalog/schema.ts`, applied while editing, not while storing).
 * The structural check accepts products without an id — the shape stored
 * before ids existed — and the load fills the missing ids in, so older
 * drafts upgrade in place instead of being discarded.
 */
import { z } from "astro/zod";

import type { SiteConfigDraft } from "@/lib/catalog/schema";
import type { DraftPersistence } from "@/lib/catalog/persistence/types";

/** localStorage key under which the editor draft is persisted. */
export const DRAFT_STORAGE_KEY = "custom-web-builder:draft";

/** The Storage subset the adapter uses; `null` when there is no backing document. */
type WebStorage = Pick<Storage, "getItem" | "setItem"> | null;

/**
 * Zod schema of the stored draft content: the structural shape of
 * `SiteConfigDraft`. Product ids are optional here because drafts stored
 * before ids existed are still valid input; {@link withStoredProductIds}
 * turns the parsed document into a full `SiteConfigDraft`, so a schema drift
 * away from the formal draft still stops compiling at that mapper.
 */
const storedDraftSchema = z.object({
  site: z.object({
    name: z.string(),
    description: z.string(),
    contactEmail: z.string(),
  }),
  products: z.array(
    z.object({
      id: z.number().int().positive().optional(),
      name: z.string(),
      categories: z.array(z.string()),
      description: z.string(),
      price: z.string(),
      imageUrl: z.string(),
    }),
  ),
});

/** Document the structural schema reads back, with optional product ids. */
type StoredDraft = z.infer<typeof storedDraftSchema>;

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
  return {
    load: async () => {
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
    },
    save: async (draft) => {
      if (storage === null) return;
      try {
        storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // Persisting is best effort on purpose: editing continues without it.
      }
    },
  };
}
