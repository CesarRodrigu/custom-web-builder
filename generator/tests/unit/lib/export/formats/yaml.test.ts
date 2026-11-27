import { describe, expect, it } from "vitest";

import { yamlFormat } from "@/lib/export/formats/yaml";

describe("yamlFormat", () => {
  it("serializes the site metadata as a flat YAML document", () => {
    expect(
      yamlFormat.serialize({
        name: "Panadería María",
        description: "Pan artesano",
      }),
    ).toBe("name: Panadería María\ndescription: Pan artesano\n");
  });

  it("serializes nested products with their category folder chains as lists", () => {
    expect(
      yamlFormat.serialize({
        name: "Bakery",
        products: [
          { name: "Bread", categories: [["Bread"]], price: 1.5 },
          {
            name: "Cake",
            categories: [["Sweets", "Cakes"], ["Drinks"]],
            price: 4,
          },
        ],
      }),
    ).toBe(
      [
        "name: Bakery",
        "products:",
        "  - name: Bread",
        "    categories:",
        "      - - Bread",
        "    price: 1.5",
        "  - name: Cake",
        "    categories:",
        "      - - Sweets",
        "        - Cakes",
        "      - - Drinks",
        "    price: 4",
        "",
      ].join("\n"),
    );
  });

  it("renders an empty image gallery as a valid product document", () => {
    expect(
      yamlFormat.serialize({
        sku: "SKU-1",
        name: "Bread",
        mainImage: "",
        images: [],
      }),
    ).toBe(
      ["sku: SKU-1", "name: Bread", "mainImage: ''", "images: []", ""].join(
        "\n",
      ),
    );
  });

  it("renders empty collections inline as sequence items", () => {
    expect(yamlFormat.serialize({ rows: [[], {}] })).toBe(
      ["rows:", "  - []", "  - {}", ""].join("\n"),
    );
  });

  it.each([
    { name: "null", value: null, expected: "null\n" },
    { name: "undefined", value: undefined, expected: "" },
    { name: "a boolean", value: true, expected: "true\n" },
    { name: "a number", value: 19.99, expected: "19.99\n" },
    { name: "an empty list", value: [], expected: "[]\n" },
    { name: "an empty object", value: {}, expected: "{}\n" },
    {
      name: "a string that needs quoting",
      value: "true",
      expected: "'true'\n",
    },
  ])("serializes $name", ({ value, expected }) => {
    expect(yamlFormat.serialize(value)).toBe(expected);
  });

  it("rejects values YAML cannot represent", () => {
    expect(() => yamlFormat.serialize(Symbol("test"))).toThrow();
  });

  it("exports the yaml file extension so package files end in .yaml", () => {
    expect(yamlFormat.fileExtension).toBe("yaml");
  });
});
