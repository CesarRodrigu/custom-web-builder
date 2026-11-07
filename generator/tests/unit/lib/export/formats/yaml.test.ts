import { describe, expect, it } from "vitest";

import { yamlFormat } from "@/lib/export/formats/yaml";

describe("yamlFormat", () => {
  it("serializes the site metadata as a flat YAML document, quoting non plain strings", () => {
    expect(
      yamlFormat.serialize({
        name: "Panadería María",
        description: "Pan artesano",
      }),
    ).toBe(['name: "Panadería María"', "description: Pan artesano"].join("\n"));
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
        "  -",
        "    name: Bread",
        "    categories:",
        "      -",
        "        - Bread",
        "    price: 1.5",
        "  -",
        "    name: Cake",
        "    categories:",
        "      -",
        "        - Sweets",
        "        - Cakes",
        "      -",
        "        - Drinks",
        "    price: 4",
      ].join("\n"),
    );
  });

  it.each([
    { name: "null", value: null, expected: "null" },
    { name: "undefined", value: undefined, expected: "null" },
    { name: "a boolean", value: true, expected: "true" },
    { name: "a number", value: 19.99, expected: "19.99" },
    { name: "an empty list", value: [], expected: "[]" },
    { name: "an empty object", value: {}, expected: "{}" },
    {
      name: "a string that needs quoting",
      value: "1 + 2 = 3",
      expected: '"1 + 2 = 3"',
    },
    {
      name: "an unsupported primitive using JSON.stringify",
      value: Symbol("test"),
      expected: undefined,
    },
  ])("serializes $name", ({ value, expected }) => {
    expect(yamlFormat.serialize(value)).toBe(expected);
  });

  it("exports the yaml file extension so package files end in .yaml", () => {
    expect(yamlFormat.fileExtension).toBe("yaml");
  });
});
