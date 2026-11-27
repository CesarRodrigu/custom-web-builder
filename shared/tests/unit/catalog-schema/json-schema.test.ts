import { describe, expect, it } from "vitest";

import {
  categoryJsonSchema,
  productJsonSchema,
  siteJsonSchema,
  type DocumentJsonSchema,
} from "@/catalog-schema/json-schema";

/**
 * Reads a property of a generated schema.
 * @param schema Schema node.
 * @param key Property name.
 * @returns The property node.
 */
function prop(schema: DocumentJsonSchema, key: string): DocumentJsonSchema {
  return (schema.properties as Record<string, DocumentJsonSchema>)[key];
}

describe("document JSON Schemas", () => {
  it("generates a standalone schema for the site document", () => {
    const schema = siteJsonSchema();
    expect(schema.$schema).toContain("json-schema.org");
    expect(schema.required).toEqual([
      "$schema",
      "name",
      "description",
      "contactEmail",
    ]);
  });

  it("generates a standalone schema for the product document", () => {
    const schema = productJsonSchema();
    expect(schema.$schema).toContain("json-schema.org");
    expect(schema.required).toEqual([
      "$schema",
      "sku",
      "name",
      "price",
      "categories",
      "shortDescription",
      "mainImage",
      "images",
    ]);
  });

  it("generates a standalone schema for the category document", () => {
    const schema = categoryJsonSchema();
    expect(schema.$schema).toContain("json-schema.org");
    expect(schema.required).toEqual(["$schema", "id", "name", "products"]);
  });

  it("declares the reference property in every schema", () => {
    for (const schema of [
      siteJsonSchema(),
      productJsonSchema(),
      categoryJsonSchema(),
    ]) {
      expect(prop(schema, "$schema").type).toBe("string");
    }
  });

  it("keeps the constraints Zod can express, such as the status enum", () => {
    expect(prop(productJsonSchema(), "status").enum).toEqual([
      "recommended",
      "not-for-sale",
    ]);
  });
});
