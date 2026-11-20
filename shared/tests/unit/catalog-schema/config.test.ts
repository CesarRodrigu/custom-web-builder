import { describe, expect, it } from "vitest";

import { siteConfigDraftSchema } from "@/catalog-schema/config";
import { ValidationCode } from "@/catalog-schema/validation";

const completeProduct = {
  id: 1,
  name: "Baguette",
  categories: ["Panes"],
  description: "Miga ligera.",
  price: 2.4,
  imageUrl: "https://example.com/baguette.svg",
  images: [],
};

const completeDraft = {
  site: {
    name: "Dulce Hogar",
    description: "Panadería artesanal.",
    contactEmail: "hola@dulcehogar.example",
  },
  products: [completeProduct],
};

describe("siteConfigDraftSchema", () => {
  it("accepts a complete draft with site metadata and products", () => {
    const result = siteConfigDraftSchema.safeParse(completeDraft);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(completeDraft);
    }
  });

  it("accepts a draft with no products yet", () => {
    const draft = { ...completeDraft, products: [] };

    expect(siteConfigDraftSchema.safeParse(draft).success).toBe(true);
  });

  it("rejects a draft whose site name is blank", () => {
    const draft = {
      ...completeDraft,
      site: { ...completeDraft.site, name: "   " },
    };

    const result = siteConfigDraftSchema.safeParse(draft);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(ValidationCode.Required);
    }
  });

  it("rejects a draft with an invalid product price", () => {
    const draft = {
      ...completeDraft,
      products: [{ ...completeProduct, price: -1 }],
    };

    const result = siteConfigDraftSchema.safeParse(draft);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(ValidationCode.Price);
    }
  });

  it("rejects a product without the editor-only id", () => {
    const result = siteConfigDraftSchema.safeParse({
      ...completeDraft,
      products: [{ ...completeProduct, id: undefined }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        message: ValidationCode.Required,
        path: ["products", 0, "id"],
      });
    }
  });

  it("rejects a draft without site metadata", () => {
    expect(siteConfigDraftSchema.safeParse({ products: [] }).success).toBe(
      false,
    );
  });
});
