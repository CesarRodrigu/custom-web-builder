import { expect, test } from "@playwright/test";

const SITE_NAME = "Dulce Hogar";
const SITE_DESCRIPTION =
  "Panadería artesanal con masa madre, bollería y postres horneados cada día.";

test.describe("home page", () => {
  test("shows the site name exported by the generator", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(`Página de inicio | ${SITE_NAME}`);
    await expect(
      page.getByRole("heading", { level: 1, name: SITE_NAME }),
    ).toBeVisible();
  });

  test("shows the description and the contact email of the exported site", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByText(SITE_DESCRIPTION)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /hola@dulcehogar\.example/ }),
    ).toBeVisible();
  });

  test("declares the description and the document language", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      SITE_DESCRIPTION,
    );
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });

  test("features the configured number of products from the catalog", async ({
    page,
  }) => {
    await page.goto("/es/");

    await expect(page.getByTestId("product-card")).toHaveCount(3);
  });

  test("features the recommended product first", async ({ page }) => {
    await page.goto("/es/");

    const firstCard = page.getByTestId("product-card").first();

    await expect(firstCard).toContainText("Baguette");
    await expect(firstCard.getByTestId("product-status")).toHaveText(
      "Recomendado",
    );
  });
});
