import { expect, test } from "@playwright/test";

test.describe("home page", () => {
  test("shows the composed title with the 'Page | Site' pattern", async ({
    page,
  }) => {
    await page.goto("/");

    // Follows the same contract as src/lib/metadata.ts#buildTitle
    await expect(page).toHaveTitle("Home page | Astro");
  });

  test("shows the main heading with the site name", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Astro");
  });

  test("declares the description and the document language", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "Website generator: home-page",
    );
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
