import { expect, test } from "@playwright/test";
import { ProductStatus } from "@custom-web-builder/shared/catalog-schema";
import { productsPageSize } from "@/config/catalog";

import {
  catalogPages,
  localizedPrice,
  productCategories,
  productPage,
  products,
  productsPagePath,
  sortedProducts,
  statusLabels,
} from "@tests/e2e/content";

const catalogs = [
  {
    locale: "es",
    heading: "Nuestros productos",
    pageLabel: "Página",
    nextLabel: "Siguiente",
    previousLabel: "Anterior",
  },
  {
    locale: "en",
    heading: "Our products",
    pageLabel: "Page",
    nextLabel: "Next",
    previousLabel: "Previous",
  },
] as const;

for (const {
  locale,
  heading,
  pageLabel,
  nextLabel,
  previousLabel,
} of catalogs) {
  const path = productsPagePath(locale, 1);

  test.describe(`products page at ${path}`, () => {
    test("lists the exported products on the first page", async ({ page }) => {
      await page.goto(path);

      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      await expect(page.getByTestId("product-card")).toHaveCount(
        Math.min(productsPageSize, products.length),
      );
    });

    test("shows the name, price and category of a product", async ({
      page,
    }) => {
      const product =
        products.find((item) => productCategories(item).length > 0) ??
        products[0];
      test.skip(!product, "The exported catalog has no products");

      await page.goto(path);

      const card = page
        .getByTestId("product-card")
        .filter({ hasText: product.name });
      await expect(card).toContainText(product.name);
      await expect(card).toContainText(localizedPrice(product.price, locale));
      await expect(card).toContainText(productCategories(product)[0].name);
    });

    test("lists recommended products before the rest", async ({ page }) => {
      const displayOrder = sortedProducts(locale);
      test.skip(displayOrder.length < 2, "The catalog has too few products");

      await page.goto(path);

      const cards = page.getByTestId("product-card");
      for (const [index, product] of displayOrder.slice(0, 2).entries()) {
        await expect(cards.nth(index)).toContainText(product.name);
      }
      if (displayOrder[0].status === ProductStatus.Recommended) {
        await expect(cards.first().getByTestId("product-status")).toHaveText(
          statusLabels[locale].recommended,
        );
      }
    });

    test("shows the status badge and stock of a product", async ({ page }) => {
      const product =
        products.find((item) => item.status && item.stock !== undefined) ??
        products.find((item) => item.stock !== undefined);
      test.skip(!product, "No exported product declares stock");

      await page.goto(path);

      const card = page
        .getByTestId("product-card")
        .filter({ hasText: product.name });
      if (product.status === ProductStatus.Recommended) {
        await expect(card.getByTestId("product-status")).toHaveText(
          statusLabels[locale].recommended,
        );
      } else if (product.status === ProductStatus.NotForSale) {
        await expect(card.getByTestId("product-status")).toHaveText(
          statusLabels[locale].notForSale,
        );
      }
      await expect(card).toContainText(
        `${statusLabels[locale].stock}: ${product.stock}`,
      );
    });

    test("paginates the catalog with numbered links", async ({ page }) => {
      await page.goto(path);

      if (catalogPages < 2) {
        await expect(
          page.getByRole("link", { name: `${pageLabel} 2` }),
        ).toHaveCount(0);
        await expect(page.getByRole("link", { name: nextLabel })).toHaveCount(
          0,
        );
        return;
      }

      const firstPageLink = page.getByRole("link", {
        name: `${pageLabel} 1`,
      });
      const secondPageLink = page.getByRole("link", {
        name: `${pageLabel} 2`,
      });

      await expect(firstPageLink).toHaveAttribute("aria-current", "page");
      await expect(secondPageLink).not.toHaveAttribute("aria-current", "page");

      await secondPageLink.click();

      await expect(page).toHaveURL(
        new RegExp(`${productsPagePath(locale, 2)}$`),
      );
      await expect(page.getByTestId("product-card")).toHaveCount(
        products.length - productsPageSize,
      );
      await expect(secondPageLink).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("link", { name: nextLabel })).toHaveCount(0);
    });

    test("shows the status of a product that is not for sale on its page", async ({
      page,
    }) => {
      const product = products.find(
        (item) => item.status === ProductStatus.NotForSale,
      );
      await page.goto(
        product ? productsPagePath(locale, productPage(product, locale)) : path,
      );

      if (!product) {
        await expect(
          page.getByText(statusLabels[locale].notForSale),
        ).toHaveCount(0);
        return;
      }

      const card = page
        .getByTestId("product-card")
        .filter({ hasText: product.name });
      await expect(card.getByTestId("product-status")).toHaveText(
        statusLabels[locale].notForSale,
      );
    });

    test("navigates back to the first page", async ({ page }) => {
      await page.goto(catalogPages > 1 ? productsPagePath(locale, 2) : path);

      if (catalogPages > 1) {
        await page.getByRole("link", { name: previousLabel }).click();
        await expect(page).toHaveURL(new RegExp(`${path}$`));
      } else {
        await expect(
          page.getByRole("link", { name: previousLabel }),
        ).toHaveCount(0);
      }
      await expect(page.getByTestId("product-card")).toHaveCount(
        Math.min(productsPageSize, products.length),
      );
    });
  });
}
