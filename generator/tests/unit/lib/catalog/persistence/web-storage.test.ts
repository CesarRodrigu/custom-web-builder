import { describe, expect, it } from "vitest";

import {
  DRAFT_STORAGE_KEY,
  createWebStorageDraftPersistence,
} from "@/lib/catalog/persistence/web-storage";
import type { SiteConfigDraft } from "@/lib/catalog/schema";

/** Storage methods the web storage adapter relies on. */
type FakeStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Builds a complete valid draft out of partial overrides, so tests only
 * specify the fields under check.
 * @param overrides Partial draft to merge over an empty valid base.
 * @returns A full draft to persist or read back.
 */
function draftWith(overrides: Partial<SiteConfigDraft>): SiteConfigDraft {
  const base: SiteConfigDraft = {
    site: {
      name: "Panadería María",
      description: "",
      contactEmail: "",
    },
    products: [],
  };
  return {
    ...base,
    ...overrides,
    site: { ...base.site, ...overrides.site },
    products: overrides.products ?? base.products,
  };
}

/**
 * Builds a fake of the storage the adapter uses, backed by a plain object,
 * so unit tests run without a DOM.
 * @param entries Stored key/value pairs to start from.
 * @returns A storage-like object exposing the persisted entries.
 */
function createFakeStorage(entries: Record<string, string> = {}): FakeStorage {
  const box = new Map(Object.entries(entries));
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => {
      box.set(key, String(value));
    },
  };
}

describe("createWebStorageDraftPersistence", () => {
  it("saves and loads back the same draft", async () => {
    const draft = draftWith({
      products: [
        {
          id: 1,
          name: "Tarta de manzana",
          categories: ["Dulces/Tartas"],
          description: "",
          price: "19,99",
          imageUrl: "",
        },
      ],
    });
    const persistence = createWebStorageDraftPersistence(createFakeStorage());

    await persistence.save(draft);

    await expect(persistence.load()).resolves.toEqual(draft);
  });

  it("fills in the ids missing in a draft stored before ids existed", async () => {
    const legacy = {
      site: { name: "Panadería María", description: "", contactEmail: "" },
      products: [
        {
          name: "Tarta",
          categories: [],
          description: "",
          price: "5",
          imageUrl: "",
        },
        {
          name: "Pan",
          categories: ["Salados"],
          description: "",
          price: "2",
          imageUrl: "",
        },
      ],
    };
    const persistence = createWebStorageDraftPersistence(
      createFakeStorage({ [DRAFT_STORAGE_KEY]: JSON.stringify(legacy) }),
    );

    await expect(persistence.load()).resolves.toEqual({
      ...legacy,
      products: [
        { ...legacy.products[0], id: 1 },
        { ...legacy.products[1], id: 2 },
      ],
    });
  });

  it("keeps the stored ids and assigns the missing ones above the highest", async () => {
    const mixed = {
      site: { name: "Panadería María", description: "", contactEmail: "" },
      products: [
        {
          id: 5,
          name: "Tarta",
          categories: [],
          description: "",
          price: "5",
          imageUrl: "",
        },
        {
          name: "Pan",
          categories: [],
          description: "",
          price: "2",
          imageUrl: "",
        },
      ],
    };
    const persistence = createWebStorageDraftPersistence(
      createFakeStorage({ [DRAFT_STORAGE_KEY]: JSON.stringify(mixed) }),
    );

    await expect(persistence.load()).resolves.toEqual({
      ...mixed,
      products: [
        { ...mixed.products[0], id: 5 },
        { ...mixed.products[1], id: 6 },
      ],
    });
  });

  it("returns nothing when the storage is unavailable", async () => {
    const persistence = createWebStorageDraftPersistence(null);

    await expect(persistence.load()).resolves.toBeUndefined();
    await expect(persistence.save(draftWith({}))).resolves.toBeUndefined();
  });

  it("returns nothing when nothing was stored yet", async () => {
    const persistence = createWebStorageDraftPersistence(createFakeStorage());

    await expect(persistence.load()).resolves.toBeUndefined();
  });

  it("reports corrupt storage contents as an empty draft", async () => {
    const persistence = createWebStorageDraftPersistence(
      createFakeStorage({ [DRAFT_STORAGE_KEY]: "{ not json" }),
    );

    await expect(persistence.load()).resolves.toBeUndefined();
  });

  it("rejects storage contents that do not match the draft shape", async () => {
    const persistence = createWebStorageDraftPersistence(
      createFakeStorage({
        [DRAFT_STORAGE_KEY]: JSON.stringify({
          site: { name: 7 },
          products: [],
        }),
      }),
    );

    await expect(persistence.load()).resolves.toBeUndefined();
  });

  it("drops stale keys of stored contents that otherwise fit the draft shape", async () => {
    const stale = { ...draftWith({}), deprecatedField: "Legacy" };
    const persistence = createWebStorageDraftPersistence(
      createFakeStorage({ [DRAFT_STORAGE_KEY]: JSON.stringify(stale) }),
    );

    await expect(persistence.load()).resolves.toEqual(draftWith({}));
  });

  it("reports failing reads as an empty draft", async () => {
    const persistence = createWebStorageDraftPersistence({
      getItem: () => {
        throw new Error("storage disabled");
      },
      setItem: () => {},
    } satisfies FakeStorage);

    await expect(persistence.load()).resolves.toBeUndefined();
  });

  it("tolerates a failing storage write", async () => {
    const persistence = createWebStorageDraftPersistence({
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
    } satisfies FakeStorage);

    await expect(persistence.save(draftWith({}))).resolves.toBeUndefined();
  });
});
