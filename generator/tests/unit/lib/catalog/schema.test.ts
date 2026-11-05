import { describe, expect, it } from "vitest";

import {
  nextProductId,
  parseSiteConfig,
  type ProductDraft,
  type SiteConfigDraft,
} from "@/lib/catalog/schema";

/**
 * Builds an empty product draft carrying the given id, so id tests only
 * specify the identity under check.
 * @param id Incremental id of the product.
 * @returns An empty product draft ready for the catalog.
 */
function productWithId(id: number): ProductDraft {
  return {
    id,
    name: "",
    categories: [],
    description: "",
    price: "",
    imageUrl: "",
  };
}

/**
 * Builds a complete valid draft out of partial overrides, so tests only
 * specify the fields under check.
 * @param overrides Partial draft to merge over an empty valid base.
 * @returns A full draft ready to be validated.
 */
function draftWith(overrides: Partial<SiteConfigDraft>): SiteConfigDraft {
  const base: SiteConfigDraft = {
    site: {
      name: "Panadería María",
      description: "",
      contactEmail: "",
    },
    products: [],
  };
  return {
    ...base,
    ...overrides,
    site: { ...base.site, ...overrides.site },
    products: overrides.products ?? base.products,
  };
}

describe("parseSiteConfig", () => {
  it("accepts a minimal draft and normalizes it into a valid configuration", () => {
    const result = parseSiteConfig(
      draftWith({
        site: {
          name: "  Panadería María  ",
          description: "   ",
          contactEmail: "",
        },
        products: [
          {
            id: 1,
            name: "  Tarta de manzana  ",
            categories: ["  Dulces/Tartas  "],
            description: "",
            price: "19,99",
            imageUrl: "   ",
          },
        ],
      }),
    );

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.config).toEqual({
      site: { name: "Panadería María" },
      products: [
        {
          name: "Tarta de manzana",
          categories: [["Dulces", "Tartas"]],
          price: 19.99,
        },
      ],
    });
  });

  it("accepts filled optional fields and a decimal-point price", () => {
    const result = parseSiteConfig(
      draftWith({
        site: {
          name: "Bakery",
          description: "Fresh bread",
          contactEmail: "hello@bakery.com",
        },
        products: [
          {
            id: 1,
            name: "Bread",
            categories: [],
            description: "Whole grain",
            price: "0.5",
            imageUrl: "https://example.com/bread.jpg",
          },
        ],
      }),
    );

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.config).toEqual({
      site: {
        name: "Bakery",
        description: "Fresh bread",
        contactEmail: "hello@bakery.com",
      },
      products: [
        {
          name: "Bread",
          categories: [],
          price: 0.5,
          description: "Whole grain",
          imageUrl: "https://example.com/bread.jpg",
        },
      ],
    });
  });

  it("reports a required issue when the site name is blank", () => {
    const result = parseSiteConfig(
      draftWith({
        site: {
          name: "   ",
          description: "",
          contactEmail: "",
        },
      }),
    );

    expect(result).toEqual({
      valid: false,
      issues: [{ field: "site.name", code: "required" }],
    });
  });

  it("reports an issue for a malformed contact email", () => {
    const result = parseSiteConfig(
      draftWith({
        site: {
          name: "Bakery",
          description: "",
          contactEmail: "not-an-email",
        },
      }),
    );

    expect(result).toEqual({
      valid: false,
      issues: [{ field: "site.contactEmail", code: "email" }],
    });
  });

  it("reports a price issue for a product without a valid price", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          {
            id: 1,
            name: "Bread",
            categories: [],
            description: "",
            price: "abc",
            imageUrl: "",
          },
        ],
      }),
    );

    expect(result).toEqual({
      valid: false,
      issues: [{ field: "products.0.price", code: "price" }],
    });
  });

  it("reports a duplicate issue per product sharing the same trimmed name", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          {
            id: 1,
            name: "  Pan  ",
            categories: [],
            description: "",
            price: "2",
            imageUrl: "",
          },
          {
            id: 2,
            name: "pan",
            categories: [],
            description: "",
            price: "3",
            imageUrl: "",
          },
          {
            id: 3,
            name: "Tarta",
            categories: [],
            description: "",
            price: "1",
            imageUrl: "",
          },
        ],
      }),
    );

    expect(result).toEqual({
      valid: false,
      issues: [
        { field: "products.0.name", code: "duplicate" },
        { field: "products.1.name", code: "duplicate" },
      ],
    });
  });

  it("appends the duplicate issues after the schema issues", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          {
            id: 1,
            name: "Pan",
            categories: [],
            description: "",
            price: "",
            imageUrl: "",
          },
          {
            id: 2,
            name: "PAN",
            categories: [],
            description: "",
            price: "",
            imageUrl: "",
          },
        ],
      }),
    );

    expect(result).toEqual({
      valid: false,
      issues: [
        { field: "products.0.price", code: "price" },
        { field: "products.1.price", code: "price" },
        { field: "products.0.name", code: "duplicate" },
        { field: "products.1.name", code: "duplicate" },
      ],
    });
  });

  it("normalizes every category path and keeps the product in several categories", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          {
            id: 1,
            name: "Bread",
            categories: [" Dulces caseros / Panes especiales ", "Postres"],
            description: "",
            price: "2",
            imageUrl: "",
          },
        ],
      }),
    );

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.config.products[0]?.categories).toEqual([
      ["Dulces caseros", "Panes especiales"],
      ["Postres"],
    ]);
  });

  it("reports a category issue per path with empty segments", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          {
            id: 1,
            name: "Bread",
            categories: ["Dulces", "/Tartas/"],
            description: "",
            price: "2",
            imageUrl: "",
          },
        ],
      }),
    );

    expect(result).toEqual({
      valid: false,
      issues: [{ field: "products.0.categories.1", code: "category" }],
    });
  });

  it("reports a price issue for more than two decimals", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          {
            id: 1,
            name: "Bread",
            categories: [],
            description: "",
            price: "10.999",
            imageUrl: "",
          },
        ],
      }),
    );

    expect(result).toEqual({
      valid: false,
      issues: [{ field: "products.0.price", code: "price" }],
    });
  });

  it("reports a url issue for an image URL without an http scheme", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          {
            id: 1,
            name: "Bread",
            categories: [],
            description: "",
            price: "1.50",
            imageUrl: "ftp://example.com/bread.jpg",
          },
        ],
      }),
    );

    expect(result).toEqual({
      valid: false,
      issues: [{ field: "products.0.imageUrl", code: "url" }],
    });
  });

  it("collects the issues of every offending field in schema order", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          {
            id: 1,
            name: "",
            categories: [],
            description: "",
            price: "",
            imageUrl: "",
          },
          {
            id: 2,
            name: "",
            categories: ["Dulces//Tartas"],
            description: "",
            price: "2",
            imageUrl: "",
          },
        ],
      }),
    );

    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.issues.map((issue) => issue.field)).toEqual([
      "products.0.name",
      "products.0.price",
      "products.1.name",
      "products.1.categories.0",
    ]);
  });

  it("keeps the product id out of the exported configuration", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [{ ...productWithId(7), name: "Bread", price: "2" }],
      }),
    );

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.config.products[0]).not.toHaveProperty("id");
  });
});

describe("nextProductId", () => {
  it("starts at 1 for an empty catalog", () => {
    expect(nextProductId([])).toBe(1);
  });

  it("continues above the highest id so deleted ids are never reused", () => {
    // The catalog holds the product that used to be second: the first one
    // (id 1) was deleted, so the next product must not become id 1 again.
    expect(nextProductId([productWithId(2)])).toBe(3);
    expect(nextProductId([productWithId(2), productWithId(5)])).toBe(6);
  });
});
