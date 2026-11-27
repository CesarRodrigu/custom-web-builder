import { expect, test } from "@playwright/test";

import {
  categoryPath,
  escapeRegExp,
  localizedPrice,
  productCategories,
  productPath,
  products,
  productsPagePath,
  sortedProducts,
  statusLabels,
} from "@tests/e2e/content";

const detailProduct =
  products.find((product) => product.longDescription) ?? products[0];

const detailPages = [
  {
    locale: "es",
    backToProducts: "Volver a productos",
  },
  {
    locale: "en",
    backToProducts: "Back to products",
  },
] as const;

for (const { locale, backToProducts } of detailPages) {
  const path = detailProduct
    ? productPath(detailProduct, locale)
    : productsPagePath(locale, 1);

  test.describe(`product detail page at ${path}`, () => {
    test("shows the exported product details", async ({ page }) => {
      test.skip(!detailProduct, "The exported catalog has no products");

      await page.goto(path);

      await expect(
        page.getByRole("heading", { level: 1, name: detailProduct.name }),
      ).toBeVisible();
      await expect(
        page.getByText(localizedPrice(detailProduct.price, locale)),
      ).toBeVisible();
      for (const category of productCategories(detailProduct)) {
        await expect(
          page.getByRole("link", { name: category.name }),
        ).toHaveAttribute("href", categoryPath(category, locale));
      }
      await expect(
        page.getByRole("link", { name: new RegExp(backToProducts) }),
      ).toHaveAttribute("href", productsPagePath(locale, 1));
    });

    test("shows the exported descriptions and stock", async ({ page }) => {
      test.skip(!detailProduct, "The exported catalog has no products");

      await page.goto(path);

      if (detailProduct.shortDescription) {
        await expect(
          page.getByText(detailProduct.shortDescription).first(),
        ).toBeVisible();
      }
      if (detailProduct.longDescription) {
        await expect(
          page.getByText(detailProduct.longDescription).first(),
        ).toBeVisible();
      }
      if (detailProduct.stock !== undefined) {
        await expect(
          page.getByText(
            `${statusLabels[locale].stock}: ${detailProduct.stock}`,
            { exact: false },
          ),
        ).toBeVisible();
      }
    });

    test("links back to the localized products page", async ({ page }) => {
      test.skip(!detailProduct, "The exported catalog has no products");

      await page.goto(path);

      await page
        .getByRole("link", { name: new RegExp(backToProducts) })
        .click();

      await expect(page).toHaveURL(
        new RegExp(`${productsPagePath(locale, 1)}$`),
      );
    });
  });
}

test("opens a product detail page from the products grid", async ({ page }) => {
  const product = sortedProducts("es")[0];
  test.skip(!product, "The exported catalog has no products");

  await page.goto(productsPagePath("es", 1));

  await page
    .getByTestId("product-link")
    .filter({ hasText: product.name })
    .click();

  await expect(page).toHaveURL(
    new RegExp(`${escapeRegExp(productPath(product, "es"))}$`),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: product.name }),
  ).toBeVisible();
});
