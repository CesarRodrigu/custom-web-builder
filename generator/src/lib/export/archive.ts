/**
 * Name of the downloaded export archive.
 *
 * The archive is always a ZIP regardless of the inner file format, so the
 * name does not depend on the selected export format at all.
 */
import { toSlug } from "@/lib/metadata";
import type { SiteConfig } from "@/lib/catalog/schema";

/**
 * Builds the file name of the exported archive: a stable, slug based name.
 * The archive is always a ZIP, regardless of the inner file format.
 * @param config Validated site configuration, whose site name feeds the slug.
 * @returns File name like `panaderia-maria.zip`.
 */
export function buildExportFileName(config: SiteConfig): string {
  const base = toSlug(config.site.name) || "site-configuration";
  return `${base}.zip`;
}
