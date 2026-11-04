/**
 * JSON export format: the default, human readable and tooling friendly.
 *
 * Serialization is the plain value mapped through `JSON` with two-space
 * pretty printing, so documents stay diffable.
 */
import type { ExportFormat } from "@/lib/export/types";

/**
 * Serializes one plain value as pretty printed JSON.
 * @param value Value to serialize.
 * @returns The JSON document.
 */
function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/** JSON format registered in the export registry. */
export const jsonFormat: ExportFormat = {
  id: "json",
  mimeType: "application/zip",
  fileExtension: "json",
  serialize,
} as const;
