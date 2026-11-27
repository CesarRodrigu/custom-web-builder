/**
 * Port of the draft persistence: the contract every implementation satisfies
 * to move the editor draft across sessions.
 *
 * The port is defined once in the shared catalog model together with the draft
 * it moves; this module keeps the name used by the composition root and the
 * adapters of the editor.
 */
export type { DraftPersistence } from "@custom-web-builder/shared/catalog-schema";
