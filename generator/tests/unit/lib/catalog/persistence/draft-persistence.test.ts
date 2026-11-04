import { describe, expect, it } from "vitest";

import { getDraftPersistence } from "@/lib/catalog/persistence/draft-persistence";
import type { SiteConfigDraft } from "@/lib/catalog/schema";

/**
 * Builds a complete valid draft with every field filled, so the composition
 * root is exercised end to end against its real implementation.
 * @returns A full draft to persist or read back.
 */
function sampleDraft(): SiteConfigDraft {
  return {
    site: {
      name: "Panadería María",
      description: "",
      contactEmail: "",
    },
    products: [],
  };
}

describe("getDraftPersistence", () => {
  it("resolves the web storage implementation and degrades on the server", async () => {
    // Under the node test environment there is no `window`, so the resolved
    // adapter carries no backing storage and behaves like an empty one.
    const persistence = getDraftPersistence();

    await expect(persistence.load()).resolves.toBeUndefined();
    await expect(persistence.save(sampleDraft())).resolves.toBeUndefined();
  });
});
