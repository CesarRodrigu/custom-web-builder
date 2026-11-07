/**
 * Composition root of the draft persistence: the single module where the app
 * chooses which `DraftPersistence` implementation backs the editor draft.
 *
 * Swapping the backing store — say, moving the draft into a database — means
 * calling a different implementation of the port here; the editor, the port
 * contract and the rest of the adapters stay untouched.
 */
import type { DraftPersistence } from "@/lib/catalog/persistence/types";
import { createWebStorageDraftPersistence } from "@/lib/catalog/persistence/web-storage";

/**
 * Builds the persistence the editor draft flows through.
 * @returns The persistence the whole app uses, one instance per call.
 */
export function getDraftPersistence(): DraftPersistence {
  return createWebStorageDraftPersistence();
}
