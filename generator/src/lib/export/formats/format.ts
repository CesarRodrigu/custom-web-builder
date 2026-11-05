/**
 * Export format registry.
 *
 * One entry per supported format, self-contained under `formats/`; the list
 * below is the single place where a format becomes available. Every consumer
 * — the editor select, the serializers, the file names — picks the change up
 * from this module, and `ExportFormatId` is derived from the list, so the
 * type union widens itself when a format is added.
 */
import { jsonFormat } from "@/lib/export/formats/json";
import { yamlFormat } from "@/lib/export/formats/yaml";
import type { ExportFormat } from "@/lib/export/types";

export type { ExportFormat } from "@/lib/export/types";

/** Formats the configuration can be exported to, in the order the UI shows them. */
export const exportFormats: readonly ExportFormat[] = [jsonFormat, yamlFormat];

/** Identifier union of every registered format, derived from the registry. */
export type ExportFormatId = (typeof exportFormats)[number]["id"];

/**
 * Looks up an export format by identifier.
 * @param id Identifier of the requested format.
 * @returns The registered format, or `undefined` when the id is not registered.
 */
export function getExportFormat(id: string): ExportFormat | undefined {
  return exportFormats.find((format) => format.id === id);
}
