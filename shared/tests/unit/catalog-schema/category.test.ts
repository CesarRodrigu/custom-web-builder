import { describe, expect, it } from "vitest";

import {
  categorySchema,
  categoryDraftSchema,
  productReferenceSchema,
} from "@/catalog-schema/category";

describe("categorySchema", () => {
  it("accepts a category that lists its products by entry id", () => {
    const category = {
      id: "panes",
      name: "Panes",
      description: "Hogazas y barras de fermentación lenta.",
      products: ["panes/baguette", "panes/pan-de-masa-madre"],
    };

    expect(categorySchema.parse(category)).toEqual(category);
  });

  it("requires the generated id", () => {
    const category = {
      id: "panes",
      name: "Panes",
      products: ["panes/baguette"],
    };

    expect(categorySchema.parse(category)).toEqual(category);
    expect(
      categorySchema.safeParse({ name: "Panes", products: [] }).success,
    ).toBe(false);
    expect(
      categorySchema.safeParse({ id: "", name: "Panes", products: [] }).success,
    ).toBe(false);
  });

  it("requires the product list, even when the category is empty", () => {
    expect(
      categorySchema.safeParse({ id: "panes", name: "Panes", products: [] })
        .success,
    ).toBe(true);
    expect(
      categorySchema.safeParse({ id: "panes", name: "Panes" }).success,
    ).toBe(false);
  });

  it("rejects references already resolved instead of entry ids", () => {
    expect(
      categorySchema.safeParse({
        id: "panes",
        name: "Panes",
        products: [{ collection: "products", id: "panes/baguette" }],
      }).success,
    ).toBe(false);
  });
});

describe("categoryDraftSchema", () => {
  it("extends the exported document with the editor-only id", () => {
    const draft = { id: 1, name: "Panes", description: "" };

    expect(categoryDraftSchema.parse(draft)).toEqual(draft);
  });

  it("drops the membership of the exported document", () => {
    const draft = {
      id: 1,
      name: "Panes",
      description: "",
      products: ["panes/baguette"],
    };

    expect(categoryDraftSchema.parse(draft)).toEqual({
      id: 1,
      name: "Panes",
      description: "",
    });
  });

  it("requires the editor-only id and the fields the form renders", () => {
    expect(categoryDraftSchema.safeParse({ name: "Panes" }).success).toBe(
      false,
    );
    expect(
      categoryDraftSchema.safeParse({ id: 1, name: "   ", description: "" })
        .success,
    ).toBe(false);
  });
});

describe("productReferenceSchema", () => {
  it("accepts the reference shape the collection resolves", () => {
    const reference = { collection: "products", id: "panes/baguette" };

    expect(productReferenceSchema.parse(reference)).toEqual(reference);
  });
});
