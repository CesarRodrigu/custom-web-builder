import { expect, test } from "@playwright/test";

const pages = [
  {
    locale: "es",
    path: "/es/products/panes/baguette/",
    heading: "Baguette",
    price: /2,40/,
    category: "Panes",
    backToProducts: "Volver a productos",
    shortDescription: "Miga ligera y corteza fina, recién horneada.",
    longDescription: /Elaborada con masa de fermentación lenta/,
    stockLabel: "Stock",
  },
  {
    locale: "en",
    path: "/en/products/panes/baguette/",
    heading: "Baguette",
    price: /2\.40/,
    category: "Panes",
    backToProducts: "Back to products",
    shortDescription: "Miga ligera y corteza fina, recién horneada.",
    longDescription: /Elaborada con masa de fermentación lenta/,
    stockLabel: "In stock",
  },
];

for (const {
  locale,
  path,
  heading,
  price,
  category,
  backToProducts,
  shortDescription,
  longDescription,
  stockLabel,
} of pages) {
  test.describe(`product detail page at ${path}`, () => {
    test("shows the exported product details", async ({ page }) => {
      await page.goto(path);

      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      await expect(page.getByText(category).first()).toBeVisible();
      await expect(page.getByText(price)).toBeVisible();
      await expect(
        page.getByRole("link", { name: new RegExp(backToProducts) }),
      ).toHaveAttribute("href", `/${locale}/products/`);
    });

    test("shows the short and long descriptions and the stock", async ({
      page,
    }) => {
      await page.goto(path);

      await expect(page.getByText(shortDescription).first()).toBeVisible();
      await expect(page.getByText(longDescription).first()).toBeVisible();
      await expect(page.getByText(stockLabel, { exact: false })).toBeVisible();
    });

    test("links back to the localized products page", async ({ page }) => {
      await page.goto(path);

      await page
        .getByRole("link", { name: new RegExp(backToProducts) })
        .click();

      await expect(page).toHaveURL(new RegExp(`/${locale}/products/?$`));
    });
  });
}

test("opens a product detail page from the products grid", async ({ page }) => {
  await page.goto("/es/products/");

  await page
    .getByTestId("product-link")
    .filter({ hasText: "Baguette" })
    .click();

  await expect(page).toHaveURL(/\/es\/products\/panes\/baguette\/?$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Baguette" }),
  ).toBeVisible();
});
