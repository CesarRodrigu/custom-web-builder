import { describe, expect, it } from "vitest";

import { buildExportFileName } from "@/lib/export/archive";
import type { SiteConfig } from "@/lib/catalog/schema";

describe("buildExportFileName", () => {
  it("builds the file name from the slug of the site name, always as a ZIP", () => {
    const config: SiteConfig = {
      site: { name: "Panadería María" },
      products: [],
    };

    expect(buildExportFileName(config)).toBe("panaderia-maria.zip");
  });

  it("falls back to a stable base when the site name has no alphanumeric characters", () => {
    const config: SiteConfig = {
      site: { name: "%%%" },
      products: [],
    };

    expect(buildExportFileName(config)).toBe("site-configuration.zip");
  });
});
