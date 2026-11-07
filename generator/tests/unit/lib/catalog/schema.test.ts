import { describe, expect, it } from "vitest";

import {
  nextProductId,
  parseSiteConfig,
  ValidationCode,
  type FieldIssue,
  type SiteConfig,
  type SiteConfigValidation,
} from "@/lib/catalog/schema";
import { draftWith, productWith } from "@tests/unit/helpers/fixtures";

/**
 * Asserts that a validation result is valid and returns its normalized
 * configuration, so tests can inspect the output without repeating the type
 * guard.
 * @param result Validation result under check.
 * @returns The normalized configuration carried by a valid result.
 */
function expectValidConfig(result: SiteConfigValidation): SiteConfig {
  expect(result.valid).toBe(true);
  return (result as Extract<SiteConfigValidation, { valid: true }>).config;
}

/**
 * Asserts that a validation result is invalid and returns its issues, so tests
 * can inspect them without repeating the type guard.
 * @param result Validation result under check.
 * @returns The issues carried by an invalid result.
 */
function expectInvalidIssues(result: SiteConfigValidation): FieldIssue[] {
  expect(result.valid).toBe(false);
  return (result as Extract<SiteConfigValidation, { valid: false }>).issues;
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
          productWith({
            name: "  Tarta de manzana  ",
            categories: ["  Dulces/Tartas  "],
            price: "19,99",
            imageUrl: "   ",
          }),
        ],
      }),
    );

    expect(expectValidConfig(result)).toEqual({
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
          productWith({
            name: "Bread",
            price: "0.5",
            description: "Whole grain",
            imageUrl: "https://example.com/bread.jpg",
          }),
        ],
      }),
    );

    expect(expectValidConfig(result)).toEqual({
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

  it.each([
    {
      name: "a blank site name",
      draft: { site: { name: "   " } },
      issues: [{ field: "site.name", code: ValidationCode.Required }],
    },
    {
      name: "a site name that is not text",
      draft: { site: { name: 42 as unknown as string } },
      issues: [{ field: "site.name", code: ValidationCode.Required }],
    },
    {
      name: "a malformed contact email",
      draft: { site: { contactEmail: "not-an-email" } },
      issues: [{ field: "site.contactEmail", code: ValidationCode.Email }],
    },
    {
      name: "a product without a valid price",
      draft: {
        products: [productWith({ name: "Bread", price: "abc" })],
      },
      issues: [{ field: "products.0.price", code: ValidationCode.Price }],
    },
    {
      name: "a price with more than two decimals",
      draft: {
        products: [productWith({ name: "Bread", price: "10.999" })],
      },
      issues: [{ field: "products.0.price", code: ValidationCode.Price }],
    },
    {
      name: "an image URL without an http scheme",
      draft: {
        products: [
          productWith({
            name: "Bread",
            price: "1.50",
            imageUrl: "ftp://example.com/bread.jpg",
          }),
        ],
      },
      issues: [{ field: "products.0.imageUrl", code: ValidationCode.Url }],
    },
    {
      name: "a category path with empty segments",
      draft: {
        products: [
          productWith({
            name: "Bread",
            price: "2",
            categories: ["Dulces", "/Tartas/"],
          }),
        ],
      },
      issues: [
        { field: "products.0.categories.1", code: ValidationCode.Category },
      ],
    },
  ])("reports $name as a validation issue", ({ draft, issues }) => {
    const result = parseSiteConfig(draftWith(draft));

    expect(result).toEqual({ valid: false, issues });
  });

  it("reports a duplicate issue per product sharing the same trimmed name", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          productWith({ id: 1, name: "  Pan  ", price: "2" }),
          productWith({ id: 2, name: "pan", price: "3" }),
          productWith({ id: 3, name: "Tarta", price: "1" }),
        ],
      }),
    );

    expect(result).toEqual({
      valid: false,
      issues: [
        { field: "products.0.name", code: ValidationCode.Duplicate },
        { field: "products.1.name", code: ValidationCode.Duplicate },
      ],
    });
  });

  it("appends the duplicate issues after the schema issues", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          productWith({ id: 1, name: "Pan" }),
          productWith({ id: 2, name: "PAN" }),
        ],
      }),
    );

    expect(result).toEqual({
      valid: false,
      issues: [
        { field: "products.0.price", code: ValidationCode.Price },
        { field: "products.1.price", code: ValidationCode.Price },
        { field: "products.0.name", code: ValidationCode.Duplicate },
        { field: "products.1.name", code: ValidationCode.Duplicate },
      ],
    });
  });

  it("normalizes every category path and keeps the product in several categories", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          productWith({
            name: "Bread",
            categories: [" Dulces caseros / Panes especiales ", "Postres"],
            price: "2",
          }),
        ],
      }),
    );

    expect(expectValidConfig(result).products[0]?.categories).toEqual([
      ["Dulces caseros", "Panes especiales"],
      ["Postres"],
    ]);
  });

  it("collects the issues of every offending field in schema order", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [
          productWith({ id: 1 }),
          productWith({
            id: 2,
            categories: ["Dulces//Tartas"],
            price: "2",
          }),
        ],
      }),
    );

    expect(expectInvalidIssues(result).map((issue) => issue.field)).toEqual([
      "products.0.name",
      "products.0.price",
      "products.1.name",
      "products.1.categories.0",
    ]);
  });

  it("keeps the product id out of the exported configuration", () => {
    const result = parseSiteConfig(
      draftWith({
        products: [productWith({ id: 7, name: "Bread", price: "2" })],
      }),
    );

    expect(expectValidConfig(result).products[0]).not.toHaveProperty("id");
  });
});

describe("nextProductId", () => {
  it.each([
    {
      name: "an empty catalog",
      products: [],
      expected: 1,
    },
    {
      name: "a catalog whose first product was deleted",
      products: [productWith({ id: 2 })],
      expected: 3,
    },
    {
      name: "a catalog with a gap between ids",
      products: [productWith({ id: 2 }), productWith({ id: 5 })],
      expected: 6,
    },
  ])("returns $expected for $name", ({ products, expected }) => {
    expect(nextProductId(products)).toBe(expected);
  });
});

describe("ValidationCode", () => {
  it("keeps the codes stable so the editor messages do not break", () => {
    expect(ValidationCode).toEqual({
      Required: "required",
      Email: "email",
      Price: "price",
      Url: "url",
      Category: "category",
      Duplicate: "duplicate",
    });
  });
});
