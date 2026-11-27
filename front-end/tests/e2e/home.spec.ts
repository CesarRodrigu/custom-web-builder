import { expect, test } from "@playwright/test";
import { ProductStatus } from "@custom-web-builder/shared/catalog-schema";

import {
  escapeRegExp,
  featuredCount,
  site,
  sortedProducts,
  statusLabels,
} from "@tests/e2e/content";

test.describe("home page", () => {
  test("shows the site name exported by the generator", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(`Página de inicio | ${site.name}`);
    await expect(
      page.getByRole("heading", { level: 1, name: site.name }),
    ).toBeVisible();
  });

  test("shows the exported contact email and description when present", async ({
    page,
  }) => {
    await page.goto("/");

    if (site.description) {
      await expect(page.getByText(site.description)).toBeVisible();
    }
    if (site.contactEmail) {
      await expect(
        page.getByRole("link", {
          name: new RegExp(escapeRegExp(site.contactEmail)),
        }),
      ).toBeVisible();
    } else {
      await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
    }
  });

  test("declares the exported description and the document language", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      site.description,
    );
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });

  test("features the configured number of products from the catalog", async ({
    page,
  }) => {
    await page.goto("/es/");

    await expect(page.getByTestId("product-card")).toHaveCount(featuredCount);
  });

  test("features the recommended product first", async ({ page }) => {
    const [featured] = sortedProducts("es");
    test.skip(!featured, "The exported catalog has no products");

    await page.goto("/es/");

    const firstCard = page.getByTestId("product-card").first();
    await expect(firstCard).toContainText(featured.name);
    if (featured.status === ProductStatus.Recommended) {
      await expect(firstCard.getByTestId("product-status")).toHaveText(
        statusLabels.es.recommended,
      );
    }
  });
});
