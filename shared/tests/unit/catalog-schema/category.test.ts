import { describe, expect, it } from "vitest";

import {
  categoryDocumentSchema,
  productReferenceSchema,
} from "@/catalog-schema/category";

describe("categoryDocumentSchema", () => {
  it("accepts a category that lists its products by entry id", () => {
    const category = {
      name: "Panes",
      description: "Hogazas y barras de fermentación lenta.",
      products: ["panes/baguette", "panes/pan-de-masa-madre"],
    };

    expect(categoryDocumentSchema.parse(category)).toEqual(category);
  });

  it("requires the product list, even when the category is empty", () => {
    expect(
      categoryDocumentSchema.safeParse({ name: "Panes", products: [] }).success,
    ).toBe(true);
    expect(categoryDocumentSchema.safeParse({ name: "Panes" }).success).toBe(
      false,
    );
  });

  it("rejects references already resolved instead of entry ids", () => {
    expect(
      categoryDocumentSchema.safeParse({
        name: "Panes",
        products: [{ collection: "products", id: "panes/baguette" }],
      }).success,
    ).toBe(false);
  });
});

describe("productReferenceSchema", () => {
  it("accepts the reference shape the collection resolves", () => {
    const reference = { collection: "products", id: "panes/baguette" };

    expect(productReferenceSchema.parse(reference)).toEqual(reference);
  });
});
