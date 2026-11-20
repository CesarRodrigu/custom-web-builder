/**
 * Site metadata of the exported package, loaded from `src/content/site`.
 *
 * Importing the exported document keeps a single source of truth while letting
 * pages and components use the metadata synchronously, without reading the
 * `site` content collection on every build.
 */
import type { SiteMeta } from "@custom-web-builder/shared/catalog-schema";

const siteDocuments = import.meta.glob<SiteMeta>(
  "/src/content/site.{json,yaml,yml}",
  {
    eager: true,
  },
);

const siteDocument: SiteMeta = Object.values(siteDocuments)[0];

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
