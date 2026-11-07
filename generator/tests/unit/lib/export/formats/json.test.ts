import { describe, expect, it } from "vitest";

import { jsonFormat } from "@/lib/export/formats/json";

describe("jsonFormat", () => {
  it("pretty prints the value with two-space indentation", () => {
    expect(jsonFormat.serialize({ name: "Bakery", price: 2 })).toBe(
      JSON.stringify({ name: "Bakery", price: 2 }, null, 2),
    );
  });

  it("exports the json file extension so package files end in .json", () => {
    expect(jsonFormat.fileExtension).toBe("json");
  });
});
