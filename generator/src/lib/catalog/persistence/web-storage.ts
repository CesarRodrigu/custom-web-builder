/**
 * Web storage implementation of the {@link DraftPersistence} port.
 *
 * The draft lives as one JSON document under a fixed `localStorage` key. The
 * storage is read defensively: it can be missing (server render), disabled,
 * or full, and the stored content is untrusted data, so every access
 * degrades into "there was nothing stored" without ever reaching the editing
 * flow.
 *
 * The structural Zod schema and the storage key are defined once in the shared
 * catalog model. That schema is the partial of the rule-free shapes, so any
 * field may be absent; the load completes the missing values before the draft
 * reaches the editor.
 */
import {
  BLANK_PRICE,
  buildDefaultSku,
  type SiteConfigDraft,
} from "@/lib/catalog/schema";
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
 * Completes a stored draft so the editor receives a full `SiteConfigDraft`.
 * Missing texts load blank, missing lists load empty and missing ids are
 * assigned above the highest one found. A missing SKU is generated from the
 * site and product names, avoiding every SKU already present.
 * @param stored Draft read from storage; any field may be absent.
 * @returns The draft with every current field present.
 */
function withCompleteDraft(stored: StoredDraft): SiteConfigDraft {
  const storedProducts = stored.products ?? [];
  const storedCategories = stored.categories ?? [];
  let nextId = storedProducts.reduce(
    (max, product) => Math.max(max, product.id ?? 0),
    0,
  );

  const taken = new Set<string>();
  for (const product of storedProducts) {
    const sku = product.sku?.trim().toUpperCase();
    if (sku) taken.add(sku);
  }

  const products = storedProducts.map((product) => {
    const storedSku = product.sku?.trim().toUpperCase() ?? "";
    const hasSku = storedSku !== "";
    const sku = hasSku
      ? storedSku
      : buildDefaultSku(stored.site?.name ?? "", product.name ?? "", taken);
    taken.add(sku);
    return {
      ...product,
      sku,
      skuAuto: product.skuAuto ?? !hasSku,
      name: product.name ?? "",
      price: product.price ?? BLANK_PRICE,
      categories: product.categories ?? [],
      folder: product.folder ?? "",
      shortDescription: product.shortDescription ?? "",
      mainImage: product.mainImage ?? "",
      images: product.images ?? [],
      id: product.id ?? ++nextId,
    };
  });

  let nextCategoryId = storedCategories.reduce(
    (max, category) => Math.max(max, category.id ?? 0),
    0,
  );
  const categories = storedCategories.map((category) => ({
    id: category.id ?? ++nextCategoryId,
    name: category.name ?? "",
    description: category.description ?? "",
  }));

  return {
    site: {
      name: stored.site?.name ?? "",
      description: stored.site?.description ?? "",
      contactEmail: stored.site?.contactEmail ?? "",
    },
    folders: stored.folders ?? [],
    products,
    categories,
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
      return result.success ? withCompleteDraft(result.data) : undefined;
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
