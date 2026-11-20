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
import { productSchema } from "@custom-web-builder/shared/catalog-schema";

describe("content collections", () => {
  it("registers the products and categories collections", () => {
    expect(Object.keys(collections)).toEqual(["products", "categories"]);
  });

  it("loads product documents from the exported folder", () => {
    expect(collections.products.loader).toEqual({
      pattern: "**/*.{json,yaml,yml}",
      base: "./src/content/products",
    });
  });

  it("validates products with the shared document schema", () => {
    expect(collections.products.schema).toBe(productSchema);
  });

  it("loads category documents from the exported folder", () => {
    expect(collections.categories.loader).toEqual({
      pattern: "**/*.{json,yaml,yml}",
      base: "./src/content/categories",
    });
  });

  it("resolves category product references against the products collection", () => {
    expect(
      collections.categories.schema.parse({
        name: "Panes",
        products: ["panes/baguette"],
      }),
    ).toEqual({
      name: "Panes",
      products: [{ collection: "products", id: "panes/baguette" }],
    });
  });
});
