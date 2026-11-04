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

  it("covers the scalar and empty shapes the configuration can produce", () => {
    expect(yamlFormat.serialize(null)).toBe("null");
    expect(yamlFormat.serialize(undefined)).toBe("null");
    expect(yamlFormat.serialize(true)).toBe("true");
    expect(yamlFormat.serialize(19.99)).toBe("19.99");
    expect(yamlFormat.serialize([])).toBe("[]");
    expect(yamlFormat.serialize({})).toBe("{}");
    expect(yamlFormat.serialize("1 + 2 = 3")).toBe('"1 + 2 = 3"');
  });

  it("exports the yaml file extension so package files end in .yaml", () => {
    expect(yamlFormat.fileExtension).toBe("yaml");
  });
});
