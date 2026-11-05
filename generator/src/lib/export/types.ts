/**
 * Contract every export format satisfies.
 *
 * A format is a self-contained module: descriptor fields for the registry,
 * plus its own serializer. New formats join the export by adding a module
 * under `formats/` and registering it in `format.ts` — no caller has to
 * change, and no shared `switch` has to grow a new branch.
 */

/** One export format: descriptor plus serializer, registered in `format.ts`. */
export interface ExportFormat {
  /** Stable identifier used by the UI selectors and tests. */
  readonly id: string;
  /** MIME type of the exported archive. */
  readonly mimeType: string;
  /** File extension of the files inside the archive. */
  readonly fileExtension: string;
  /**
   * Serializes one plain value (site metadata or product document) in this
   * format.
   * @param value Value to serialize.
   * @returns The serialized document.
   */
  serialize: (value: unknown) => string;
}
