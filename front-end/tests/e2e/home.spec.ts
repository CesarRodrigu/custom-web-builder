import { expect, test } from "@playwright/test";

test.describe("home", () => {
  test("test", async ({ page }) => {
    await page.goto("/");
    await expect(page).toBeDefined();
  });
});
