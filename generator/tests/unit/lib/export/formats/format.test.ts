import { describe, expect, it } from "vitest";

import { exportFormats, getExportFormat } from "@/lib/export/formats/format";

describe("exportFormats", () => {
  it("registers a self-contained module per supported format in UI order", () => {
    expect(exportFormats.map((format) => format.id)).toEqual(["json", "yaml"]);
    for (const format of exportFormats) {
      expect(typeof format.serialize).toBe("function");
      expect(format.mimeType.length).toBeGreaterThan(0);
      expect(format.fileExtension.length).toBeGreaterThan(0);
    }
  });
});

describe("getExportFormat", () => {
  it("returns the registered format by its stable id", () => {
    const json = getExportFormat("json");
    const yaml = getExportFormat("yaml");

    expect(json?.id).toBe("json");
    expect(yaml?.id).toBe("yaml");
  });

  it("returns undefined for an unregistered format id", () => {
    expect(getExportFormat("toml")).toBeUndefined();
  });
});
