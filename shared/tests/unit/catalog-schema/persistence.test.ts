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

describe("DRAFT_STORAGE_KEY", () => {
  it("uses the key of the editor draft", () => {
    expect(DRAFT_STORAGE_KEY).toBe("custom-web-builder:draft");
  });
});

describe("storedDraftSchema", () => {
  it("reads back a draft whose products still have ids", () => {
    const draft = {
      site: storedSite,
      products: [
        {
          id: 1,
          name: "Baguette",
          categories: ["Panes"],
          description: "Miga ligera.",
          price: 2.4,
          imageUrl: "https://example.com/baguette.svg",
        },
      ],
    };

    const result = storedDraftSchema.safeParse(draft);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(draft);
    }
  });

  it("reads back an old draft whose products have no ids", () => {
    const draft = {
      site: storedSite,
      products: [
        {
          name: "Baguette",
          categories: ["Panes"],
          description: "",
          price: -1,
          imageUrl: "",
        },
      ],
    };

    expect(storedDraftSchema.safeParse(draft).success).toBe(true);
  });

  it("keeps an unfinished draft without applying the editing rules", () => {
    const draft = {
      site: { name: "", description: "", contactEmail: "not-an-email" },
      products: [
        {
          name: "",
          categories: ["Panes/Bollería"],
          description: "",
          price: -1,
          imageUrl: "ftp://example.com/baguette.svg",
        },
      ],
    };

    const result = storedDraftSchema.safeParse(draft);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(draft);
    }
  });

  it("rejects a stored document whose site metadata is structurally wrong", () => {
    expect(
      storedDraftSchema.safeParse({ site: { name: 42 }, products: [] }).success,
    ).toBe(false);
  });

  it("rejects a stored document whose products are not an array", () => {
    expect(
      storedDraftSchema.safeParse({ site: storedSite, products: {} }).success,
    ).toBe(false);
  });
});
