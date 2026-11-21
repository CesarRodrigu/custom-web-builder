import { describe, expect, it, vi } from "vitest";

vi.mock("astro:content", async () => {
  const { z } = await import("astro/zod");

  return {
    defineCollection: (config: unknown) => config,
    reference: (collection: string) =>
      z.string().transform((id) => ({ collection, id })),
  };
});

vi.mock("astro/loaders", () => ({ glob: (config: unknown) => config }));

import { collections } from "@/content.config";

/** Collection shape the mocked `defineCollection` returns at runtime. */
interface TestCollection {
  /** Glob loader configuration under test. */
  loader: {
    pattern: string;
    base: string;
    generateId?: (options: {
      entry: string;
      data: Record<string, unknown>;
    }) => string;
  };
  /** Zod schema under test. */
  schema: { parse: (value: unknown) => unknown };
}

const testCollections = collections as unknown as Record<
  "products" | "categories",
  TestCollection
>;

describe("content collections", () => {
  it("registers the products and categories collections", () => {
    expect(Object.keys(collections)).toEqual(["products", "categories"]);
  });

  it("loads product documents from the exported folder", () => {
    expect(testCollections.products.loader).toEqual({
      pattern: "**/*.{json,yaml,yml}",
      base: "./src/content/products",
    });
  });

  it("turns product category names into astro references", () => {
    expect(
      testCollections.products.schema.parse({
        sku: "DULCE-HOGAR-BAGUETTE-001",
        name: "Baguette",
        price: 2.4,
        categories: ["Bollería", "Panes"],
        shortDescription: "Miga ligera.",
        mainImage: "",
        images: [],
      }),
    ).toMatchObject({
      categories: [
        { collection: "categories", id: "bolleria" },
        { collection: "categories", id: "panes" },
      ],
    });
  });

  it("loads category documents from the exported folder", () => {
    expect(testCollections.categories.loader).toMatchObject({
      pattern: "**/*.{json,yaml,yml}",
      base: "./src/content/categories",
    });
    expect(testCollections.categories.loader.generateId).toBeTypeOf("function");
  });

  it("uses the id exported by the generator as the collection entry id", () => {
    const generateId = testCollections.categories.loader.generateId!;

    expect(generateId({ entry: "cafe-2.json", data: { id: "cafe-2" } })).toBe(
      "cafe-2",
    );
  });

  it("resolves category product references against the products collection", () => {
    expect(
      testCollections.categories.schema.parse({
        id: "panes",
        name: "Panes",
        products: ["panes/baguette"],
      }),
    ).toEqual({
      id: "panes",
      name: "Panes",
      products: [{ collection: "products", id: "panes/baguette" }],
    });
  });
});
