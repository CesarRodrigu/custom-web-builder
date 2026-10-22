import { expect, test } from "@playwright/test";

test.describe("home page", () => {
  test("shows the composed title with the 'Page | Site' pattern", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Página de inicio | Astro");
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
      "Website generator: pagina-de-inicio",
    );
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });
});
