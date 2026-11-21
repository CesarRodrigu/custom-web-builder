import { describe, expect, it } from "vitest";

import {
  isMainImageConsistent,
  productDocumentShape,
  productDraftSchema,
  productSchema,
  ProductStatus,
  ProductTextField,
  type ParsedProduct,
} from "@/catalog-schema/product";
import { ValidationCode } from "@/catalog-schema/validation";

const completeProduct = {
  sku: "PANADERIA-BAGUETTE-001",
  name: "Baguette",
  price: 2.4,
  categories: ["Panes"],
  folder: "panes",
  shortDescription: "Miga ligera.",
  mainImage: "/images/products/baguette.svg",
  images: ["/images/products/baguette.svg"],
};

describe("productSchema", () => {
  it("accepts the document the generator writes", () => {
    const parsed: ParsedProduct = productSchema.parse(completeProduct);

    expect(parsed).toEqual(completeProduct);
  });

  it("reads the current fields and drops unknown ones", () => {
    const parsed = productSchema.parse({
      ...completeProduct,
      description: "Miga ligera.",
      longDescription: "Fermentación lenta.",
      stock: 24,
      status: ProductStatus.Recommended,
      images: ["/images/products/baguette.svg", "/images/products/crust.svg"],
    });

    expect(parsed).not.toHaveProperty("description");
    expect(parsed.shortDescription).toBe("Miga ligera.");
    expect(parsed.longDescription).toBe("Fermentación lenta.");
    expect(parsed.stock).toBe(24);
    expect(parsed.status).toBe(ProductStatus.Recommended);
    expect(parsed.images).toEqual([
      "/images/products/baguette.svg",
      "/images/products/crust.svg",
    ]);
  });

  it("keeps the editor-only fields out of the exported document", () => {
    const draft = { ...completeProduct, id: 1, skuAuto: true };

    const document = productSchema.parse(draft);
    const parsedDraft = productDraftSchema.parse(draft);

    expect(document).not.toHaveProperty("id");
    expect(document).not.toHaveProperty("skuAuto");
    expect(parsedDraft.id).toBe(1);
    expect(parsedDraft.skuAuto).toBe(true);
  });

  it("requires the editor-only fields in a draft", () => {
    const result = productDraftSchema.safeParse({
      name: "Baguette",
      price: 2.4,
      categories: [],
      shortDescription: "Miga ligera.",
      mainImage: "",
      images: [],
    });

    expect(result.success).toBe(false);
  });

  it.each([
    { name: "missing categories", document: { categories: undefined } },
    { name: "a negative price", document: { price: -1 } },
    { name: "a price that is not a number", document: { price: "2.40" } },
    { name: "a fractional stock", document: { stock: 1.5 } },
    { name: "an unknown status", document: { status: "draft" } },
    { name: "a missing SKU", document: { sku: undefined } },
    { name: "a missing main image", document: { mainImage: undefined } },
    { name: "a missing gallery", document: { images: undefined } },
  ])("rejects $name", ({ document }) => {
    expect(
      productSchema.safeParse({ ...completeProduct, ...document }).success,
    ).toBe(false);
  });

  it("rejects three decimals with the price code", () => {
    const result = productSchema.safeParse({
      ...completeProduct,
      price: 2.4001,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(ValidationCode.Price);
    }
  });

  it("rejects a blank name with the required code", () => {
    const result = productSchema.safeParse({ ...completeProduct, name: "   " });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(ValidationCode.Required);
    }
  });

  it("rejects a blank short description with the required code", () => {
    const result = productSchema.safeParse({
      ...completeProduct,
      shortDescription: "   ",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(ValidationCode.Required);
    }
  });

  it("rejects a category with a path separator with the category code", () => {
    const result = productSchema.safeParse({
      ...completeProduct,
      categories: ["Panes/Bollería"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(ValidationCode.Category);
    }
  });

  it("rejects a non HTTP image reference with the url code", () => {
    const result = productSchema.safeParse({
      ...completeProduct,
      mainImage: "ftp://example.com/baguette.svg",
      images: ["ftp://example.com/baguette.svg"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(ValidationCode.Url);
    }
  });

  it("validates every gallery reference with the url code", () => {
    const result = productSchema.safeParse({
      ...completeProduct,
      images: ["/images/products/baguette.svg", "ftp://example.com/crust.svg"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        message: ValidationCode.Url,
        path: ["images", 1],
      });
    }
  });

  it("rejects a main image outside the gallery with the main-image code", () => {
    const result = productSchema.safeParse({
      ...completeProduct,
      mainImage: "/images/products/cover.svg",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        message: ValidationCode.MainImage,
        path: ["mainImage"],
      });
    }
  });

  it("keeps the rule-free shape permissive while the full schema validates", () => {
    const inconsistent = {
      ...completeProduct,
      mainImage: "/images/products/cover.svg",
    };

    expect(productDocumentShape.safeParse(inconsistent).success).toBe(true);
    expect(productSchema.safeParse(inconsistent).success).toBe(false);
  });

  it("rejects a gallery when the main image is blank", () => {
    expect(
      productSchema.safeParse({
        ...completeProduct,
        mainImage: "",
        images: ["/images/products/baguette.svg"],
      }).success,
    ).toBe(false);
  });

  it("accepts a product without artwork when both image fields are blank", () => {
    expect(
      productSchema.safeParse({
        ...completeProduct,
        mainImage: "",
        images: [],
      }).success,
    ).toBe(true);
  });

  it("rejects a malformed SKU with the sku code", () => {
    const result = productSchema.safeParse({
      ...completeProduct,
      sku: "panaderia tarta",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(ValidationCode.Sku);
    }
  });

  it("rejects a blank SKU with the required code", () => {
    const result = productSchema.safeParse({ ...completeProduct, sku: "   " });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(ValidationCode.Required);
    }
  });

  it("keeps the statuses of the exported documents stable", () => {
    expect(ProductStatus).toEqual({
      Recommended: "recommended",
      NotForSale: "not-for-sale",
    });
  });
});

describe("isMainImageConsistent", () => {
  it.each([
    { mainImage: "", images: [], expected: true },
    { mainImage: "/a.svg", images: ["/a.svg", "/b.svg"], expected: true },
    { mainImage: " /a.svg ", images: ["/a.svg"], expected: true },
    { mainImage: "", images: ["/a.svg"], expected: false },
    { mainImage: "/a.svg", images: [], expected: false },
    { mainImage: "/c.svg", images: ["/a.svg"], expected: false },
  ])(
    "reads $mainImage with $images as $expected",
    ({ mainImage, images, expected }) => {
      expect(isMainImageConsistent({ mainImage, images })).toBe(expected);
    },
  );
});

describe("ProductTextField", () => {
  it("keeps the plain text field names stable", () => {
    expect(ProductTextField).toEqual({
      Sku: "sku",
      Name: "name",
      Price: "price",
      MainImage: "mainImage",
    });
  });
});
