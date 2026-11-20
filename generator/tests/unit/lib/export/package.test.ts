import { describe, expect, it } from "vitest";

import { getExportFormat } from "@/lib/export/formats/format";
import {
  buildSiteFileMap,
  SITE_FILE,
  toProductPaths,
} from "@/lib/export/package";
import {
  normalizedProductWith,
  siteConfigWith,
} from "@tests/unit/helpers/fixtures";

describe("buildSiteFileMap", () => {
  it("writes one site file and one file per product under its visual folder", () => {
    const config = siteConfigWith({
      products: [
        normalizedProductWith({
          name: "Tarta de manzana",
          categories: ["Dulces", "Tartas"],
          price: 19.99,
        }),
        normalizedProductWith({ name: "Pan de centeno", price: 2.5 }),
      ],
    });

    const files = buildSiteFileMap(config);

    expect(Object.keys(files)).toEqual([
      SITE_FILE,
      "products/t/tarta-de-manzana.json",
      "products/p/pan-de-centeno.json",
    ]);
    expect(JSON.parse(files[SITE_FILE] ?? "")).toEqual({
      name: "Panadería María",
    });
    expect(JSON.parse(files["products/t/tarta-de-manzana.json"] ?? "")).toEqual(
      {
        name: "Tarta de manzana",
        price: 19.99,
        categories: ["Dulces", "Tartas"],
      },
    );
    expect(JSON.parse(files["products/p/pan-de-centeno.json"] ?? "")).toEqual({
      name: "Pan de centeno",
      price: 2.5,
      categories: [],
    });
  });

  it("writes a single file for a product with several categories", () => {
    const config = siteConfigWith({
      site: { name: "Bakery" },
      products: [
        normalizedProductWith({
          name: "Coffee cake",
          categories: ["Sweets", "Cakes", "Drinks"],
          price: 4,
        }),
      ],
    });

    const files = buildSiteFileMap(config);

    expect(Object.keys(files)).toEqual([
      SITE_FILE,
      "products/c/coffee-cake.json",
    ]);
    expect(JSON.parse(files["products/c/coffee-cake.json"] ?? "")).toEqual({
      name: "Coffee cake",
      price: 4,
      categories: ["Sweets", "Cakes", "Drinks"],
    });
  });

  it("keeps the optional description and image URL of the product file", () => {
    const config = siteConfigWith({
      site: { name: "Bakery" },
      products: [
        normalizedProductWith({
          name: "Bread",
          price: 0.5,
          description: "Whole grain",
          imageUrl: "https://example.com/bread.jpg",
        }),
      ],
    });

    const files = buildSiteFileMap(config);

    expect(JSON.parse(files["products/b/bread.json"] ?? "")).toEqual({
      name: "Bread",
      price: 0.5,
      categories: [],
      description: "Whole grain",
      imageUrl: "https://example.com/bread.jpg",
    });
  });

  it("falls back to a stable name for a slug without alphanumeric characters", () => {
    const config = siteConfigWith({
      site: { name: "%%%" },
      products: [
        normalizedProductWith({
          name: "###",
          price: 1,
        }),
      ],
    });

    const files = buildSiteFileMap(config);

    expect(Object.keys(files)).toEqual([
      SITE_FILE,
      "products/p/product-1.json",
    ]);
  });

  it("serializes every file in a non default format through the registered serializer", () => {
    const config = siteConfigWith({
      site: { name: "Bakery" },
      products: [
        normalizedProductWith({
          name: "Bread",
          categories: ["Bread"],
          price: 1,
        }),
      ],
    });

    const files = buildSiteFileMap(config, getExportFormat("yaml")!);

    expect(Object.keys(files)).toEqual(["site.yaml", "products/b/bread.yaml"]);
    expect(files["site.yaml"]).toContain("name: Bakery");
    expect(files["products/b/bread.yaml"]).toContain("price: 1");
  });
});

describe("toProductPaths", () => {
  it.each([
    {
      name: "groups a product by the first letter of its slug",
      product: normalizedProductWith({ name: "Bread", price: 1 }),
      fallbackNumber: 1,
      expected: ["products/b/bread.json"],
    },
    {
      name: "uses the given fallback number when the slug is empty",
      product: normalizedProductWith({ name: "***", price: 1 }),
      fallbackNumber: 3,
      expected: ["products/p/product-3.json"],
    },
  ])("$name", ({ product, fallbackNumber, expected }) => {
    expect(toProductPaths(product, fallbackNumber)).toEqual(expected);
  });
});
