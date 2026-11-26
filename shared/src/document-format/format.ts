/**
 * Document formats of the configuration package.
 *
 * Single definition shared by the writer and the reader: each format declares
 * its file extensions and how a document is serialized and parsed. Adding or
 * changing a format here reaches both applications without editing them.
 */
import { dump, load } from "js-yaml";

/** One document format: its extensions and its text conversion functions. */
export interface DocumentFormatDefinition {
  /** Extensions accepted when reading a document of this format. */
  readonly extensions: readonly string[];
  /** Serializes a plain value into a document of this format. */
  readonly serialize: (value: unknown) => string;
  /** Parses a document of this format back into a plain value. */
  readonly parse: (raw: string) => unknown;
}

/** Formats of the exported package, keyed by their stable identifier. */
export const documentFormats = {
  json: {
    extensions: ["json"],
    serialize: (value) => JSON.stringify(value, null, 2),
    parse: (raw) => JSON.parse(raw),
  },
  yaml: {
    extensions: ["yaml", "yml"],
    serialize: (value) => dump(value, { lineWidth: -1, noRefs: true }),
    parse: (raw) => load(raw),
  },
} as const satisfies Record<string, DocumentFormatDefinition>;

/** Stable identifier of a document format. */
export type DocumentFormatId = keyof typeof documentFormats;

/** Every extension accepted when reading an exported document. */
export const DOCUMENT_EXTENSIONS = Object.values(documentFormats).flatMap(
  (format) => format.extensions,
);

/** Glob fragment matching every readable extension, e.g. `{json,yaml,yml}`. */
export const DOCUMENT_EXTENSIONS_GLOB = `{${DOCUMENT_EXTENSIONS.join(",")}}`;

/**
 * Serializes a plain value as a document of the requested format.
 * @param value Value to write.
 * @param format Identifier of the output format.
 * @returns The document text.
 */
export function serializeDocument(
  value: unknown,
  format: DocumentFormatId,
): string {
  return documentFormats[format].serialize(value);
}

/**
 * Parses a document text using the format of its file extension, and throws
 * when the path has no extension or it belongs to no registered format.
 * @param raw Text of the document.
 * @param path Path of the document, whose extension selects the format.
 * @returns The parsed value.
 */
export function parseDocument(raw: string, path: string): unknown {
  const dot = path.lastIndexOf(".");
  const extension = dot === -1 ? "" : path.slice(dot + 1).toLowerCase();
  const format = Object.values(documentFormats).find((candidate) =>
    (candidate.extensions as readonly string[]).includes(extension),
  );
  if (!format) {
    throw new Error(`Unsupported document extension: ${extension}`);
  }
  return format.parse(raw);
}
