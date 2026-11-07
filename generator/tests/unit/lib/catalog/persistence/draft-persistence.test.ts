import { describe, expect, it } from "vitest";

import { getDraftPersistence } from "@/lib/catalog/persistence/draft-persistence";
import { draftWith } from "@tests/unit/helpers/fixtures";

describe("getDraftPersistence", () => {
  it("resolves the web storage implementation and degrades on the server", async () => {
    // Under the node test environment there is no `window`, so the resolved
    // adapter carries no backing storage and behaves like an empty one.
    const persistence = getDraftPersistence();

    await expect(persistence.load()).resolves.toBeUndefined();
    await expect(persistence.save(draftWith())).resolves.toBeUndefined();
  });
});
