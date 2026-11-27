import { describe, expect, it } from "vitest";

import {
  DOCUMENT_EXTENSIONS,
  DOCUMENT_EXTENSIONS_GLOB,
  documentFormats,
  parseDocument,
  serializeDocument,
} from "@/document-format/format";

describe("document formats", () => {
  it("defines every extension the package reader accepts", () => {
    expect(DOCUMENT_EXTENSIONS).toEqual(["json", "yaml", "yml"]);
  });

  it("derives the glob fragment from the registered extensions", () => {
    expect(DOCUMENT_EXTENSIONS_GLOB).toBe("{json,yaml,yml}");
  });

  it("keeps yml as a read alias of yaml and never as a writable format", () => {
    expect(documentFormats.yaml.extensions).toEqual(["yaml", "yml"]);
    expect(Object.keys(documentFormats)).toEqual(["json", "yaml"]);
  });
});

describe("serializeDocument", () => {
  it("pretty prints JSON with two-space indentation", () => {
    expect(serializeDocument({ name: "Bakery", price: 2 }, "json")).toBe(
      JSON.stringify({ name: "Bakery", price: 2 }, null, 2),
    );
  });

  it("writes YAML through js-yaml, with empty collections inline", () => {
    expect(serializeDocument({ name: "Bakery", images: [] }, "yaml")).toBe(
      "name: Bakery\nimages: []\n",
    );
  });
});

describe("parseDocument", () => {
  it.each(["site.json", "site.yaml", "site.yml"])(
    "reads a document with extension %s",
    (path) => {
      expect(parseDocument('{"name":"Bakery","images":[]}', path)).toEqual({
        name: "Bakery",
        images: [],
      });
    },
  );

  it("round-trips a YAML document back to the original value", () => {
    const value = { name: "Bakery", images: [], mainImage: "" };
    expect(parseDocument(serializeDocument(value, "yaml"), "site.yml")).toEqual(
      value,
    );
  });

  it("rejects a path with an unregistered extension", () => {
    expect(() => parseDocument("name: Bakery", "site.toml")).toThrow(
      "Unsupported document extension: toml",
    );
  });
});
