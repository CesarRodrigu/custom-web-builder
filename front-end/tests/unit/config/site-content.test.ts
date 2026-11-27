import {
  site,
  siteContactEmail,
  siteDescription,
  siteName,
} from "@/config/site-content";
import { siteMetaSchema } from "@custom-web-builder/shared/catalog-schema";
import {
  DOCUMENT_EXTENSIONS,
  parseDocument,
} from "@custom-web-builder/shared/document-format";
import { describe, expect, it } from "vitest";

const siteDocuments = import.meta.glob<string>("/src/content/site.*", {
  eager: true,
  query: "?raw",
  import: "default",
});

const sitePath = Object.keys(siteDocuments).find((path) =>
  DOCUMENT_EXTENSIONS.some((extension) => path.endsWith(`.${extension}`)),
);

if (!sitePath) {
  throw new Error("No site document found in src/content/site.*");
}

const exportedSite = siteMetaSchema.parse(
  parseDocument(siteDocuments[sitePath], sitePath),
);

describe("site content constants", () => {
  it("mirrors the metadata of the exported site", () => {
    expect(site).toEqual(exportedSite);
  });

  it("builds the metadata object from the named constants", () => {
    expect(site).toEqual({
      name: siteName,
      description: siteDescription,
      contactEmail: siteContactEmail,
    });
  });
});
