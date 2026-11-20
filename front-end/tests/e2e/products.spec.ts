import { expect, test } from "@playwright/test";

const pages = [
  {
    path: "/es/products/",
    secondPagePath: "/es/products/page/2/",
    heading: "Nuestros productos",
    price: /2,40/,
    recommendedLabel: "Recomendado",
    notForSaleLabel: "No en venta",
    stockLabel: "Stock",
    pageLabel: "Página",
    nextLabel: "Siguiente",
    previousLabel: "Anterior",
  },
  {
    path: "/en/products/",
    secondPagePath: "/en/products/page/2/",
    heading: "Our products",
    price: /2\.40/,
    recommendedLabel: "Recommended",
    notForSaleLabel: "Not for sale",
    stockLabel: "In stock",
    pageLabel: "Page",
    nextLabel: "Next",
    previousLabel: "Previous",
  },
];

for (const {
  path,
  secondPagePath,
  heading,
  price,
  recommendedLabel,
  notForSaleLabel,
  stockLabel,
  pageLabel,
  nextLabel,
  previousLabel,
} of pages) {
  test.describe(`products page at ${path}`, () => {
    test("lists the first page of products exported by the generator", async ({
      page,
    }) => {
      await page.goto(path);

      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      await expect(page.getByTestId("product-card")).toHaveCount(6);
    });

    test("shows the name, price and category of a product", async ({
      page,
    }) => {
      await page.goto(path);

      const baguette = page
        .getByTestId("product-card")
        .filter({ hasText: "Baguette" });

      await expect(baguette).toContainText("Baguette");
      await expect(baguette).toContainText(price);
      await expect(baguette).toContainText("Panes");
    });

    test("lists recommended products before the rest", async ({ page }) => {
      await page.goto(path);

      const cards = page.getByTestId("product-card");

      await expect(cards.first()).toContainText("Baguette");
      await expect(cards.nth(1)).toContainText("Tarta de chocolate");
      await expect(cards.first().getByTestId("product-status")).toHaveText(
        recommendedLabel,
      );
    });

    test("shows the status badge and stock of a product", async ({ page }) => {
      await page.goto(path);

      const chocolateCake = page
        .getByTestId("product-card")
        .filter({ hasText: "Tarta de chocolate" });

      await expect(chocolateCake.getByTestId("product-status")).toHaveText(
        recommendedLabel,
      );
      await expect(chocolateCake).toContainText(stockLabel);
    });

    test("paginates the catalog with numbered links", async ({ page }) => {
      await page.goto(path);

      const firstPageLink = page.getByRole("link", {
        name: `${pageLabel} 1`,
      });
      const secondPageLink = page.getByRole("link", {
        name: `${pageLabel} 2`,
      });

      await expect(firstPageLink).toHaveAttribute("aria-current", "page");
      await expect(secondPageLink).not.toHaveAttribute("aria-current", "page");

      await secondPageLink.click();

      await expect(page).toHaveURL(new RegExp(`${secondPagePath}$`));
      await expect(page.getByTestId("product-card")).toHaveCount(1);
      await expect(secondPageLink).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("link", { name: nextLabel })).toHaveCount(0);
    });

    test("shows the status of a product that is not for sale on the last page", async ({
      page,
    }) => {
      await page.goto(secondPagePath);

      const flan = page
        .getByTestId("product-card")
        .filter({ hasText: "Flan de huevo" });

      await expect(flan.getByTestId("product-status")).toHaveText(
        notForSaleLabel,
      );
    });

    test("navigates back to the first page", async ({ page }) => {
      await page.goto(secondPagePath);

      await page.getByRole("link", { name: previousLabel }).click();

      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByTestId("product-card")).toHaveCount(6);
    });
  });
}
