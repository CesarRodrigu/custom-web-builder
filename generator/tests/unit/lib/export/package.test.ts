import { describe, expect, it } from "vitest";

import { getExportFormat } from "@/lib/export/formats/format";
import {
  buildSiteFileMap,
  SITE_FILE,
  toProductPaths,
} from "@/lib/export/package";
import type { SiteConfig } from "@/lib/catalog/schema";

describe("buildSiteFileMap", () => {
  it("writes one site file and one file per product inside its category folder chain", () => {
    const config: SiteConfig = {
      site: { name: "Panadería María" },
      products: [
        {
          name: "Tarta de manzana",
          categories: [["Dulces", "Tartas"]],
          price: 19.99,
        },
        { name: "Pan de centeno", categories: [], price: 2.5 },
      ],
    };

    const files = buildSiteFileMap(config);

    expect(Object.keys(files)).toEqual([
      SITE_FILE,
      "products/dulces/tartas/tarta-de-manzana.json",
      "products/pan-de-centeno.json",
    ]);
    expect(JSON.parse(files[SITE_FILE] ?? "")).toEqual({
      name: "Panadería María",
    });
    expect(
      JSON.parse(files["products/dulces/tartas/tarta-de-manzana.json"] ?? ""),
    ).toEqual({ name: "Tarta de manzana", price: 19.99 });
    expect(JSON.parse(files["products/pan-de-centeno.json"] ?? "")).toEqual({
      name: "Pan de centeno",
      price: 2.5,
    });
  });

  it("duplicates the product file into every category chain it belongs to", () => {
    const config: SiteConfig = {
      site: { name: "Bakery" },
      products: [
        {
          name: "Coffee cake",
          categories: [["Sweets", "Cakes"], ["Drinks"]],
          price: 4,
        },
      ],
    };

    const files = buildSiteFileMap(config);
    const expectedContent = {
      name: "Coffee cake",
      price: 4,
    };

    expect(Object.keys(files)).toEqual([
      SITE_FILE,
      "products/sweets/cakes/coffee-cake.json",
      "products/drinks/coffee-cake.json",
    ]);
    expect(
      JSON.parse(files["products/sweets/cakes/coffee-cake.json"] ?? ""),
    ).toEqual(expectedContent);
    expect(JSON.parse(files["products/drinks/coffee-cake.json"] ?? "")).toEqual(
      expectedContent,
    );
  });

  it("keeps the optional description and image URL of the product file", () => {
    const config: SiteConfig = {
      site: { name: "Bakery" },
      products: [
        {
          name: "Bread",
          categories: [],
          price: 0.5,
          description: "Whole grain",
          imageUrl: "https://example.com/bread.jpg",
        },
      ],
    };

    const files = buildSiteFileMap(config);

    expect(JSON.parse(files["products/bread.json"] ?? "")).toEqual({
      name: "Bread",
      price: 0.5,
      description: "Whole grain",
      imageUrl: "https://example.com/bread.jpg",
    });
  });

  it("falls back to stable names for slugs without alphanumeric characters", () => {
    const config: SiteConfig = {
      site: { name: "%%%" },
      products: [{ name: "###", categories: [["###", "###"]], price: 1 }],
    };

    const files = buildSiteFileMap(config);

    expect(Object.keys(files)).toEqual([
      SITE_FILE,
      "products/category-1/category-2/product-1.json",
    ]);
  });

  it("serializes every file in a non default format through the registered serializer", () => {
    const config: SiteConfig = {
      site: { name: "Bakery" },
      products: [{ name: "Bread", categories: [["Bread"]], price: 1 }],
    };

    const files = buildSiteFileMap(config, getExportFormat("yaml")!);

    expect(Object.keys(files)).toEqual([
      "site.yaml",
      "products/bread/bread.yaml",
    ]);
    expect(files["site.yaml"]).toContain("name: Bakery");
    expect(files["products/bread/bread.yaml"]).toContain("price: 1");
  });
});

describe("toProductPaths", () => {
  it("places products without categories at the root of the products folder", () => {
    const paths = toProductPaths(
      { name: "Bread", categories: [], price: 1 },
      1,
    );

    expect(paths).toEqual(["products/bread.json"]);
  });

  it("uses the given fallback number as file name when the slug is empty", () => {
    const paths = toProductPaths(
      { name: "***", categories: [["Dulces"]], price: 1 },
      3,
    );

    expect(paths).toEqual(["products/dulces/product-3.json"]);
  });
});
