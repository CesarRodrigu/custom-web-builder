import { describe, expect, it } from "vitest";

import { exportFormats, getExportFormat } from "@/lib/export/formats/format";

describe("exportFormats", () => {
  it("lists the supported formats in UI order", () => {
    expect(exportFormats.map((format) => format.id)).toEqual(["json", "yaml"]);
  });

  it.each(exportFormats)(
    "registers a self-contained module for $id",
    (format) => {
      expect(typeof format.serialize).toBe("function");
      expect(format.mimeType.length).toBeGreaterThan(0);
      expect(format.fileExtension.length).toBeGreaterThan(0);
    },
  );
});

describe("getExportFormat", () => {
  it.each(["json", "yaml"])(
    "returns the registered %s format by its stable id",
    (id) => {
      expect(getExportFormat(id)?.id).toBe(id);
    },
  );

  it("returns undefined for an unregistered format id", () => {
    expect(getExportFormat("toml")).toBeUndefined();
  });
});
