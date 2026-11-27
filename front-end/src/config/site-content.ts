/**
 * Site metadata of the exported package, loaded from `src/content/site`.
 *
 * Importing the exported document keeps a single source of truth while letting
 * pages and components use the metadata synchronously. Files are read as raw
 * text because Vite only understands JSON as a module, and the shared format
 * registry decides which extensions are accepted and how each one is parsed.
 */
import {
  DOCUMENT_EXTENSIONS,
  parseDocument,
} from "@custom-web-builder/shared/document-format";
import type { SiteMeta } from "@custom-web-builder/shared/catalog-schema";

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

const siteDocument = parseDocument(
  siteDocuments[sitePath],
  sitePath,
) as SiteMeta;

/** Display name of the generated site. */
export const siteName = siteDocument.name;

/** Free text describing the business. */
export const siteDescription = siteDocument.description;

/** Contact email shown on the site. */
export const siteContactEmail = siteDocument.contactEmail;

/** Site metadata in the shape of the exported `site` document. */
export const site: SiteMeta = {
  name: siteName,
  description: siteDescription,
  contactEmail: siteContactEmail,
};
