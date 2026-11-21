import { describe, expect, it } from "vitest";

import {
  DRAFT_STORAGE_KEY,
  createWebStorageDraftPersistence,
} from "@/lib/catalog/persistence/web-storage";
import { draftWith, productWith } from "@tests/unit/helpers/fixtures";

/** Storage methods the web storage adapter relies on. */
type FakeStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Builds a fake of the storage the adapter uses, backed by a plain object, so
 * unit tests run without a DOM.
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
        productWith({
          name: "Tarta de manzana",
          categories: ["Tartas"],
          price: 19.99,
        }),
      ],
    });
    const persistence = createWebStorageDraftPersistence(createFakeStorage());

    await persistence.save(draft);

    await expect(persistence.load()).resolves.toEqual(draft);
  });

  it("keeps a SKU typed by the user across a reload", async () => {
    const draft = draftWith({
      products: [productWith({ name: "Tarta", sku: "MI-CODIGO-007" })],
    });
    const persistence = createWebStorageDraftPersistence(createFakeStorage());

    await persistence.save(draft);

    await expect(persistence.load()).resolves.toEqual(draft);
  });

  it("keeps an unfinished draft without applying the editing rules", async () => {
    const draft = draftWith({
      site: { name: "", contactEmail: "not-an-email" },
      products: [productWith({ name: "", price: -1 })],
    });
    const persistence = createWebStorageDraftPersistence(createFakeStorage());

    await persistence.save(draft);

    await expect(persistence.load()).resolves.toEqual(draft);
  });

  it("returns nothing when the storage is unavailable", async () => {
    const persistence = createWebStorageDraftPersistence(null);

    await expect(persistence.load()).resolves.toBeUndefined();
    await expect(persistence.save(draftWith())).resolves.toBeUndefined();
  });

  it("returns nothing when nothing was stored yet", async () => {
    const persistence = createWebStorageDraftPersistence(createFakeStorage());

    await expect(persistence.load()).resolves.toBeUndefined();
  });

  it.each([
    { name: "corrupt storage contents", raw: "{ not json" },
    {
      name: "storage contents that do not match the draft shape",
      raw: JSON.stringify({ site: { name: 7 }, products: [] }),
    },
  ])("reports $name as an empty draft", async ({ raw }) => {
    const persistence = createWebStorageDraftPersistence(
      createFakeStorage({ [DRAFT_STORAGE_KEY]: raw }),
    );

    await expect(persistence.load()).resolves.toBeUndefined();
  });

  it("completes a stored product missing a current field", async () => {
    const stale = draftWith({
      products: [productWith({ mainImage: undefined })],
    });
    const persistence = createWebStorageDraftPersistence(
      createFakeStorage({ [DRAFT_STORAGE_KEY]: JSON.stringify(stale) }),
    );

    const loaded = await persistence.load();

    expect(loaded?.products[0]?.name).toBe(stale.products[0]?.name);
    expect(loaded?.products[0]?.mainImage).toBe("");
  });

  it("drops stale keys of stored contents that otherwise fit the draft shape", async () => {
    const stale = { ...draftWith(), deprecatedField: "Legacy" };
    const persistence = createWebStorageDraftPersistence(
      createFakeStorage({ [DRAFT_STORAGE_KEY]: JSON.stringify(stale) }),
    );

    await expect(persistence.load()).resolves.toEqual(draftWith());
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

    await expect(persistence.save(draftWith())).resolves.toBeUndefined();
  });
});
