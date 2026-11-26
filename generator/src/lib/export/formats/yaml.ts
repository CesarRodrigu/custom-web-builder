/**
 * YAML export format registered in the export registry.
 *
 * The document contract and its serializer live in the shared workspace
 * package, so this module only registers the descriptor the editor shows.
 */
import { documentFormats } from "@custom-web-builder/shared/document-format";

import type { ExportFormat } from "@/lib/export/types";

/** YAML format registered in the export registry. */
export const yamlFormat = {
  id: "yaml",
  mimeType: "application/zip",
  fileExtension: documentFormats.yaml.extensions[0],
  serialize: (value: unknown) => documentFormats.yaml.serialize(value),
} as const satisfies ExportFormat;
