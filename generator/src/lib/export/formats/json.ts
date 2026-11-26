/**
 * JSON export format: the default, human readable and tooling friendly.
 *
 * The document contract and its serializer live in the shared workspace
 * package, so this module only registers the descriptor the editor shows.
 */
import { documentFormats } from "@custom-web-builder/shared/document-format";

import type { ExportFormat } from "@/lib/export/types";

/** JSON format registered in the export registry. */
export const jsonFormat = {
  id: "json",
  mimeType: "application/zip",
  fileExtension: documentFormats.json.extensions[0],
  serialize: (value: unknown) => documentFormats.json.serialize(value),
} as const satisfies ExportFormat;
