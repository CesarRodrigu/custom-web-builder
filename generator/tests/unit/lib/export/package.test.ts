import { describe, expect, it } from "vitest";

import { exportFormats, getExportFormat } from "@/lib/export/formats/format";
import {
  buildCategoryDocuments,
  buildSiteFileMap,
  DOCUMENT_SCHEMA_FILES,
  FOLDERS_FILE,
  SITE_FILE,
  toProductPaths,
  toRelativeFolderPath,
} from "@/lib/export/package";
import {
  normalizedProductWith,
  siteConfigWith,
} from "@tests/unit/helpers/fixtures";

/**
 * Reads a generated document without its schema reference.
 * @param files Generated package.
 * @param path Path of the document.
 * @returns The document contents without `$schema`.
 */
function readDocument(
  files: Record<string, string>,
  path: string,
): Record<string, unknown> {
  const document = JSON.parse(files[path] ?? "") as Record<string, unknown>;
  delete document.$schema;
  return document;
}

describe("buildSiteFileMap", () => {
  it("writes one site file and one file per product in the products root", () => {
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
      "products/tarta-de-manzana.json",
      "products/pan-de-centeno.json",
      "categories/dulces.json",
      "categories/tartas.json",
      ...Object.values(DOCUMENT_SCHEMA_FILES),
    ]);
    expect(readDocument(files, "categories/dulces.json")).toEqual({
      id: "dulces",
      name: "Dulces",
      products: ["tarta-de-manzana"],
    });
    expect(readDocument(files, SITE_FILE)).toEqual({
      name: "Panadería María",
      description: "",
      contactEmail: "",
    });
    expect(readDocument(files, "products/tarta-de-manzana.json")).toEqual({
      sku: "SKU-ITEM-001",
      name: "Tarta de manzana",
      price: 19.99,
      categories: ["Dulces", "Tartas"],
      shortDescription: "Descripción breve",
      mainImage: "",
      images: [],
    });
    expect(readDocument(files, "products/pan-de-centeno.json")).toEqual({
      sku: "SKU-ITEM-001",
      name: "Pan de centeno",
      price: 2.5,
      categories: [],
      shortDescription: "Descripción breve",
      mainImage: "",
      images: [],
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
      "products/coffee-cake.json",
      "categories/sweets.json",
      "categories/cakes.json",
      "categories/drinks.json",
      ...Object.values(DOCUMENT_SCHEMA_FILES),
    ]);
    expect(readDocument(files, "products/coffee-cake.json")).toEqual({
      sku: "SKU-ITEM-001",
      name: "Coffee cake",
      price: 4,
      categories: ["Sweets", "Cakes", "Drinks"],
      shortDescription: "Descripción breve",
      mainImage: "",
      images: [],
    });
  });

  it("writes the folder list and nests a product in its assigned folder", () => {
    const config = siteConfigWith({
      site: { name: "Bakery" },
      folders: ["dulces", "dulces/tartas", "salados"],
      products: [
        normalizedProductWith({
          name: "Tarta",
          price: 2,
          folder: "dulces/tartas",
        }),
        normalizedProductWith({ name: "Pan", price: 1, folder: "salados" }),
        normalizedProductWith({ name: "Cafe", price: 1 }),
      ],
    });

    const files = buildSiteFileMap(config);

    expect(Object.keys(files)).toEqual([
      SITE_FILE,
      `${FOLDERS_FILE}.json`,
      "products/dulces/tartas/tarta.json",
      "products/salados/pan.json",
      "products/cafe.json",
      ...Object.values(DOCUMENT_SCHEMA_FILES),
    ]);
    expect(JSON.parse(files[`${FOLDERS_FILE}.json`] ?? "")).toEqual({
      folders: ["dulces", "dulces/tartas", "salados"],
    });
  });

  it("keeps the short description and the main image of the product file", () => {
    const config = siteConfigWith({
      site: { name: "Bakery" },
      products: [
        normalizedProductWith({
          name: "Bread",
          price: 0.5,
          shortDescription: "Whole grain",
          mainImage: "https://example.com/bread.jpg",
          images: ["https://example.com/bread.jpg"],
        }),
      ],
    });

    const files = buildSiteFileMap(config);

    expect(readDocument(files, "products/bread.json")).toEqual({
      sku: "SKU-ITEM-001",
      name: "Bread",
      price: 0.5,
      categories: [],
      shortDescription: "Whole grain",
      mainImage: "https://example.com/bread.jpg",
      images: ["https://example.com/bread.jpg"],
    });
  });

  it("writes the optional fields declared by the product schema", () => {
    const config = siteConfigWith({
      site: { name: "Bakery" },
      products: [
        normalizedProductWith({
          name: "Tarta",
          price: 19.99,
          categories: ["Tartas"],
          shortDescription: "Short text",
          longDescription: "Long text",
          stock: 12,
          status: "recommended",
          images: ["/images/tarta.jpg"],
          mainImage: "/images/tarta.jpg",
        }),
      ],
    });

    const files = buildSiteFileMap(config);

    expect(readDocument(files, "products/tarta.json")).toEqual({
      sku: "SKU-ITEM-001",
      name: "Tarta",
      price: 19.99,
      categories: ["Tartas"],
      shortDescription: "Short text",
      longDescription: "Long text",
      stock: 12,
      status: "recommended",
      images: ["/images/tarta.jpg"],
      mainImage: "/images/tarta.jpg",
    });
  });

  it("writes the edited name and description of a declared category", () => {
    const config = siteConfigWith({
      site: { name: "Bakery" },
      categories: [
        { name: "Panes", description: "Hogazas de fermentación lenta." },
        { name: "Dulces", description: "   " },
      ],
      products: [
        normalizedProductWith({ name: "Bread", categories: ["panes"] }),
      ],
    });

    const files = buildSiteFileMap(config);

    expect(Object.keys(files)).toEqual([
      SITE_FILE,
      "products/bread.json",
      "categories/panes.json",
      "categories/dulces.json",
      ...Object.values(DOCUMENT_SCHEMA_FILES),
    ]);
    expect(readDocument(files, "categories/panes.json")).toEqual({
      id: "panes",
      name: "Panes",
      description: "Hogazas de fermentación lenta.",
      products: ["bread"],
    });
    expect(readDocument(files, "categories/dulces.json")).toEqual({
      id: "dulces",
      name: "Dulces",
      products: [],
    });
  });

  it("writes the product SKU into the exported document", () => {
    const config = siteConfigWith({
      site: { name: "Bakery" },
      products: [
        normalizedProductWith({
          name: "Apple pie",
          price: 3.5,
          sku: "BAKERY-APPLE-PIE-001",
        }),
      ],
    });

    const files = buildSiteFileMap(config);

    expect(readDocument(files, "products/apple-pie.json")).toEqual({
      sku: "BAKERY-APPLE-PIE-001",
      name: "Apple pie",
      price: 3.5,
      categories: [],
      shortDescription: "Descripción breve",
      mainImage: "",
      images: [],
    });
  });

  it("always writes the required fields and omits blank optional text", () => {
    const config = siteConfigWith({
      site: { name: "Bakery" },
      products: [
        normalizedProductWith({
          name: "Bread",
          price: 1,
          longDescription: "",
        }),
      ],
    });

    const files = buildSiteFileMap(config);
    const document = readDocument(files, "products/bread.json");

    expect(document).toEqual({
      sku: "SKU-ITEM-001",
      name: "Bread",
      price: 1,
      categories: [],
      shortDescription: "Descripción breve",
      mainImage: "",
      images: [],
    });
    expect(document).not.toHaveProperty("description");
    expect(document).not.toHaveProperty("longDescription");
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
      "products/product-1.json",
      ...Object.values(DOCUMENT_SCHEMA_FILES),
    ]);
  });

  it("references the matching schema from every generated document", () => {
    const config = siteConfigWith({
      folders: ["dulces"],
      products: [
        normalizedProductWith({ name: "Tarta", folder: "dulces" }),
        normalizedProductWith({ name: "Bread" }),
      ],
      categories: [{ name: "Dulces" }],
    });

    const files = buildSiteFileMap(config);

    expect(JSON.parse(files[SITE_FILE] ?? "").$schema).toBe(
      "schemas/site.schema.json",
    );
    expect(JSON.parse(files["products/dulces/tarta.json"] ?? "").$schema).toBe(
      "../../schemas/product.schema.json",
    );
    expect(JSON.parse(files["products/bread.json"] ?? "").$schema).toBe(
      "../schemas/product.schema.json",
    );
    expect(JSON.parse(files["categories/dulces.json"] ?? "").$schema).toBe(
      "../schemas/category.schema.json",
    );
  });

  it("writes the Zod generated JSON Schemas in every export format", () => {
    for (const format of exportFormats) {
      const files = buildSiteFileMap(siteConfigWith(), format);
      for (const path of Object.values(DOCUMENT_SCHEMA_FILES)) {
        const schema = JSON.parse(files[path] ?? "");
        expect(schema.$schema).toContain("json-schema.org");
        expect(schema.type).toBe("object");
        expect(Array.isArray(schema.required)).toBe(true);
      }
    }
  });

  it("serializes every file in a non default format through the registered serializer", () => {
    const config = siteConfigWith({
      site: { name: "Bakery" },
      folders: ["dulces"],
      products: [
        normalizedProductWith({
          name: "Bread",
          categories: ["Bread"],
          price: 1,
          folder: "dulces",
        }),
      ],
    });

    const files = buildSiteFileMap(config, getExportFormat("yaml")!);

    expect(Object.keys(files)).toEqual([
      "site.yaml",
      "folders.yaml",
      "products/dulces/bread.yaml",
      "categories/bread.yaml",
      ...Object.values(DOCUMENT_SCHEMA_FILES),
    ]);
    expect(files["site.yaml"]).toContain("name: Bakery");
    expect(files["folders.yaml"]).toContain("dulces");
    expect(files["products/dulces/bread.yaml"]).toContain("price: 1");
    expect(files["categories/bread.yaml"]).toContain("id: bread");
  });
});

describe("toRelativeFolderPath", () => {
  it.each([
    { path: "products", expected: "" },
    { path: "products/dulces", expected: "dulces" },
    { path: "products/dulces/tartas", expected: "dulces/tartas" },
  ])("reads $path as $expected", ({ path, expected }) => {
    expect(toRelativeFolderPath(path)).toBe(expected);
  });
});

describe("toProductPaths", () => {
  it.each([
    {
      name: "places a product without a folder directly in products",
      product: normalizedProductWith({ name: "Bread", price: 1 }),
      fallbackNumber: 1,
      expected: ["products/bread.json"],
    },
    {
      name: "places a product in its assigned folder",
      product: normalizedProductWith({
        name: "Tarta",
        price: 1,
        folder: "dulces/tartas",
      }),
      fallbackNumber: 2,
      expected: ["products/dulces/tartas/tarta.json"],
    },
    {
      name: "uses the given fallback number when the slug is empty",
      product: normalizedProductWith({ name: "***", price: 1 }),
      fallbackNumber: 3,
      expected: ["products/product-3.json"],
    },
  ])("$name", ({ product, fallbackNumber, expected }) => {
    expect(toProductPaths(product, fallbackNumber)).toEqual(expected);
  });
});

describe("buildCategoryDocuments", () => {
  it("generates a unique slug id per category and references its products", () => {
    const products = [
      normalizedProductWith({
        name: "Tarta",
        folder: "dulces/tartas",
        categories: ["Dulces", "Tartas", "dulces"],
      }),
      normalizedProductWith({
        name: "Pan",
        folder: "salados",
        categories: ["Dulces"],
      }),
    ];

    expect(
      buildCategoryDocuments(
        products,
        [{ name: "Dulces" }, { name: "Tartas" }],
        getExportFormat("json")!,
      ),
    ).toEqual([
      {
        id: "dulces",
        name: "Dulces",
        products: ["dulces/tartas/tarta", "salados/pan"],
      },
      {
        id: "tartas",
        name: "Tartas",
        products: ["dulces/tartas/tarta"],
      },
    ]);
  });

  it("disambiguates names that would produce the same slug", () => {
    const products = [
      normalizedProductWith({
        name: "Bread",
        categories: ["Café", "Cafe", "CAFÉ"],
      }),
    ];

    expect(
      buildCategoryDocuments(
        products,
        [{ name: "Café" }, { name: "Cafe" }],
        getExportFormat("json")!,
      ),
    ).toEqual([
      { id: "cafe", name: "Café", products: ["bread"] },
      { id: "cafe-2", name: "Cafe", products: ["bread"] },
    ]);
  });

  it("falls back to a numbered id when a name leaves no slug", () => {
    const products = [
      normalizedProductWith({ name: "Bread", categories: ["***"] }),
    ];

    expect(
      buildCategoryDocuments(
        products,
        [{ name: "***" }],
        getExportFormat("json")!,
      ),
    ).toEqual([{ id: "category-1", name: "***", products: ["bread"] }]);
  });

  it("returns no documents when the catalog declares no categories", () => {
    expect(
      buildCategoryDocuments(
        [normalizedProductWith({ name: "Bread" })],
        [],
        getExportFormat("json")!,
      ),
    ).toEqual([]);
  });
});
