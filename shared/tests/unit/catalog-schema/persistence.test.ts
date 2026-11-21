import { describe, expect, it } from "vitest";

import {
  DRAFT_STORAGE_KEY,
  storedDraftSchema,
} from "@/catalog-schema/persistence";

const storedSite = {
  name: "Dulce Hogar",
  description: "Panadería artesanal.",
  contactEmail: "hola@dulcehogar.example",
};

const completeDraft = {
  site: storedSite,
  folders: [],
  categories: [],
  products: [
    {
      id: 1,
      sku: "PANADERIA-BAGUETTE-001",
      skuAuto: false,
      name: "Baguette",
      categories: ["Panes"],
      folder: "",
      shortDescription: "Miga ligera.",
      price: 2.4,
      mainImage: "/images/baguette.svg",
      images: ["/images/baguette.svg"],
    },
  ],
};

describe("DRAFT_STORAGE_KEY", () => {
  it("uses the key of the editor draft", () => {
    expect(DRAFT_STORAGE_KEY).toBe("custom-web-builder:draft");
  });
});

describe("storedDraftSchema", () => {
  it("reads back a complete draft", () => {
    const result = storedDraftSchema.safeParse(completeDraft);

    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(completeDraft);
  });

  it("keeps an unfinished draft without applying the editing rules", () => {
    const draft = {
      site: { name: "", description: "", contactEmail: "not-an-email" },
      folders: ["Dulces//Tartas"],
      categories: [{ id: 1, name: "", description: "" }],
      products: [
        {
          id: 1,
          sku: "not a sku",
          skuAuto: true,
          name: "",
          categories: ["Panes/Bollería"],
          folder: "Dulces",
          shortDescription: "",
          price: -1,
          mainImage: "ftp://example.com/baguette.svg",
          images: ["ftp://example.com/baguette.svg"],
        },
      ],
    };

    const result = storedDraftSchema.safeParse(draft);

    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(draft);
  });

  it("drops unknown fields", () => {
    const result = storedDraftSchema.safeParse({
      ...completeDraft,
      description: "legacy alias",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(completeDraft);
  });

  it.each([
    { name: "a product without an id", field: "id" },
    { name: "a product without a SKU", field: "sku" },
    { name: "a product without a main image", field: "mainImage" },
    { name: "a product without a gallery", field: "images" },
    { name: "a draft without categories", field: "categories" },
    { name: "a draft without folders", field: "folders" },
  ])("accepts $name", ({ field }) => {
    const draft = JSON.parse(JSON.stringify(completeDraft)) as Record<
      string,
      unknown
    >;
    if (field === "categories" || field === "folders") {
      delete draft[field];
    } else {
      const products = draft.products as Record<string, unknown>[];
      delete products[0]?.[field];
    }

    expect(storedDraftSchema.safeParse(draft).success).toBe(true);
  });

  it("rejects a field whose type does not match the shape", () => {
    expect(
      storedDraftSchema.safeParse({
        site: { name: 42 },
        products: [],
      }).success,
    ).toBe(false);
  });
});
