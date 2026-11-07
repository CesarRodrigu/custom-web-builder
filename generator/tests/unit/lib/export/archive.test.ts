import { describe, expect, it } from "vitest";

import { buildExportFileName } from "@/lib/export/archive";
import { siteConfigWith } from "@tests/unit/helpers/fixtures";

describe("buildExportFileName", () => {
  it.each([
    {
      name: "builds the file name from the slug of the site name, always as a ZIP",
      siteName: "Panadería María",
      expected: "panaderia-maria.zip",
    },
    {
      name: "falls back to a stable base when the site name has no alphanumeric characters",
      siteName: "%%%",
      expected: "site-configuration.zip",
    },
  ])("$name", ({ siteName, expected }) => {
    const config = siteConfigWith({ site: { name: siteName } });

    expect(buildExportFileName(config)).toBe(expected);
  });
});
