import { describe, expect, it } from "vitest";

import { siteConfigDraftSchema } from "@/catalog-schema/config";
import { ValidationCode } from "@/catalog-schema/validation";

const completeProduct = {
  id: 1,
  sku: "PANADERIA-BAGUETTE-001",
  skuAuto: false,
  name: "Baguette",
  categories: ["Panes"],
  folder: "panes",
  price: 2.4,
  shortDescription: "Miga ligera.",
  mainImage: "https://example.com/baguette.svg",
  images: ["https://example.com/baguette.svg"],
};

const completeDraft = {
  site: {
    name: "Dulce Hogar",
    description: "Panadería artesanal.",
    contactEmail: "hola@dulcehogar.example",
  },
  folders: ["panes"],
  products: [completeProduct],
  categories: [{ id: 1, name: "Panes", description: "" }],
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

  it("rejects a category whose name is blank", () => {
    const result = siteConfigDraftSchema.safeParse({
      ...completeDraft,
      categories: [{ id: 1, name: "   ", description: "" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        message: ValidationCode.Required,
        path: ["categories", 0, "name"],
      });
    }
  });

  it("rejects a category with a name another category already uses", () => {
    const result = siteConfigDraftSchema.safeParse({
      ...completeDraft,
      categories: [
        { id: 1, name: "Panes", description: "" },
        { id: 2, name: " panes ", description: "" },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        message: ValidationCode.DuplicateCategory,
        path: ["categories", 0, "name"],
      });
    }
  });

  it("rejects a draft without site metadata", () => {
    expect(siteConfigDraftSchema.safeParse({ products: [] }).success).toBe(
      false,
    );
  });

  it("accepts a draft with nested folder paths", () => {
    const draft = {
      ...completeDraft,
      folders: ["dulces", "dulces/tartas"],
      products: [{ ...completeProduct, folder: "dulces/tartas" }],
    };

    const result = siteConfigDraftSchema.safeParse(draft);

    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(draft);
  });

  it("rejects a malformed folder path", () => {
    const result = siteConfigDraftSchema.safeParse({
      ...completeDraft,
      folders: ["Dulces//Tartas"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        message: ValidationCode.Folder,
        path: ["folders", 0],
      });
    }
  });

  it("rejects a product assigned to a malformed folder path", () => {
    const result = siteConfigDraftSchema.safeParse({
      ...completeDraft,
      products: [{ ...completeProduct, folder: "Dulces" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        message: ValidationCode.Folder,
        path: ["products", 0, "folder"],
      });
    }
  });

  it("reports a main image outside the gallery on the product field", () => {
    const result = siteConfigDraftSchema.safeParse({
      ...completeDraft,
      products: [{ ...completeProduct, mainImage: "/images/other.svg" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        message: ValidationCode.MainImage,
        path: ["products", 0, "mainImage"],
      });
    }
  });
});
