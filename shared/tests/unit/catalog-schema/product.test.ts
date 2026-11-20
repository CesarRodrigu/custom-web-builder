import { describe, expect, it } from "vitest";

import {
  productSchema,
  ProductStatus,
  ProductTextField,
  type ParsedProduct,
} from "@/catalog-schema/product";
import { ValidationCode } from "@/catalog-schema/validation";

describe("productSchema", () => {
  it("accepts the minimal document the generator writes", () => {
    const parsed: ParsedProduct = productSchema.parse({
      name: "Baguette",
      price: 2.4,
      categories: ["Panes"],
    });

    expect(parsed).toEqual({
      name: "Baguette",
      price: 2.4,
      categories: ["Panes"],
      images: [],
    });
  });

  it("reads the legacy description next to the current fields", () => {
    const parsed = productSchema.parse({
      name: "Baguette",
      price: 2.4,
      categories: ["Panes", "Especiales"],
      description: "Miga ligera.",
      shortDescription: "Corteza fina.",
      longDescription: "Fermentación lenta.",
      stock: 24,
      status: ProductStatus.Recommended,
      imageUrl: "/images/products/baguette.svg",
      images: ["/images/products/baguette.svg"],
    });

    expect(parsed.shortDescription).toBe("Corteza fina.");
    expect(parsed.longDescription).toBe("Fermentación lenta.");
    expect(parsed.stock).toBe(24);
    expect(parsed.status).toBe(ProductStatus.Recommended);
    expect(parsed.images).toEqual(["/images/products/baguette.svg"]);
  });

  it("accepts the editor-only id of a draft", () => {
    const draft = {
      id: 1,
      name: "Baguette",
      price: 2.4,
      categories: ["Panes"],
      description: "",
      imageUrl: "",
    };

    expect(productSchema.safeParse(draft).success).toBe(true);
  });

  it.each([
    {
      name: "missing categories",
      document: { name: "Baguette", price: 2.4 },
    },
    {
      name: "a negative price",
      document: { name: "Baguette", price: -1, categories: [] },
    },
    {
      name: "a price that is not a number",
      document: { name: "Baguette", price: "2.40", categories: [] },
    },
    {
      name: "a fractional stock",
      document: { name: "Baguette", price: 2.4, categories: [], stock: 1.5 },
    },
    {
      name: "an unknown status",
      document: {
        name: "Baguette",
        price: 2.4,
        categories: [],
        status: "draft",
      },
    },
  ])("rejects $name", ({ document }) => {
    expect(productSchema.safeParse(document).success).toBe(false);
  });

  it("rejects three decimals with the price code", () => {
    const result = productSchema.safeParse({
      name: "Baguette",
      price: 2.4001,
      categories: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(ValidationCode.Price);
    }
  });

  it("rejects a blank name with the required code", () => {
    const result = productSchema.safeParse({
      name: "   ",
      price: 2.4,
      categories: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(ValidationCode.Required);
    }
  });

  it("rejects a category with a path separator with the category code", () => {
    const result = productSchema.safeParse({
      name: "Baguette",
      price: 2.4,
      categories: ["Panes/Bollería"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(ValidationCode.Category);
    }
  });

  it("rejects a non HTTP image URL with the url code", () => {
    const result = productSchema.safeParse({
      name: "Baguette",
      price: 2.4,
      categories: [],
      imageUrl: "ftp://example.com/baguette.svg",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(ValidationCode.Url);
    }
  });

  it("keeps the statuses of the exported documents stable", () => {
    expect(ProductStatus).toEqual({
      Recommended: "recommended",
      NotForSale: "not-for-sale",
    });
  });
});

describe("ProductTextField", () => {
  it("keeps the plain text field names stable", () => {
    expect(ProductTextField).toEqual({
      Name: "name",
      Description: "description",
      Price: "price",
      ImageUrl: "imageUrl",
    });
  });
});
