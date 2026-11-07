/**
 * YAML export format: a minimal, dependency free serializer covering the
 * shapes the configuration produces (objects, arrays, strings, numbers,
 * booleans and null).
 */
import type { ExportFormat } from "@/lib/export/types";

/**
 * Converts a plain value into a YAML document. Minimal recursive serializer
 * covering the shapes the configuration produces (objects, arrays, strings,
 * numbers, booleans and null).
 * @param value Value to serialize.
 * @param indent Current indentation level in spaces.
 * @returns YAML text for the value.
 */
function toYaml(value: unknown, indent: number = 0): string {
  const pad = " ".repeat(indent);
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "string") {
    return /^[a-zA-Z0-9 _./-]*$/.test(value) && value !== ""
      ? value
      : JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }
    return value
      .map((item) => {
        if (item !== null && typeof item === "object") {
          return `${pad}-\n${toYaml(item, indent + 2)}`;
        }
        return `${pad}- ${toYaml(item, indent + 2).trimStart()}`;
      })
      .join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return "{}";
    }
    return entries
      .map(([key, entryValue]) => {
        if (entryValue !== null && typeof entryValue === "object") {
          return `${pad}${key}:\n${toYaml(entryValue, indent + 2)}`;
        }
        return `${pad}${key}: ${toYaml(entryValue, indent + 2).trimStart()}`;
      })
      .join("\n");
  }
  return JSON.stringify(value);
}

/**
 * Serializes one plain value as a YAML document.
 * @param value Value to serialize.
 * @returns The YAML document.
 */
function serialize(value: unknown): string {
  return toYaml(value);
}

/** YAML format registered in the export registry. */
export const yamlFormat = {
  id: "yaml",
  mimeType: "application/zip",
  fileExtension: "yaml",
  serialize,
} as const satisfies ExportFormat;
