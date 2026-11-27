import { expect, test } from "@playwright/test";

import { waitForEditorHydration } from "@tests/e2e/helpers";
import {
  categories,
  categoryPath,
  categoryProducts,
  escapeRegExp,
  productCategories,
  productImageCount,
  productPath,
  products,
  productsPagePath,
} from "@tests/e2e/content";

const detailCategory =
  categories.find((category) => category.products.length > 0) ?? categories[0];
const multiCategoryProduct = products.find(
  (product) => productCategories(product).length > 1,
);
const galleryProduct = products.find(
  (product) => productImageCount(product) > 1,
);
const breadcrumbProduct = products[0];
const unfiled = categories
  .flatMap((category) =>
    categoryProducts(category)
      .filter((product) => !product.id.startsWith(`${category.id}/`))
      .map((product) => ({ category, product })),
  )
  .at(0);

const detailPages = [
  {
    locale: "es",
    path: detailCategory
      ? categoryPath(detailCategory, "es")
      : "/es/categories/",
    backToProducts: "Volver a productos",
  },
  {
    locale: "en",
    path: detailCategory
      ? categoryPath(detailCategory, "en")
      : "/en/categories/",
    backToProducts: "Back to products",
  },
] as const;

for (const { locale, path, backToProducts } of detailPages) {
  test.describe(`category page at ${path}`, () => {
    test("renders the products the category references", async ({ page }) => {
      test.skip(!detailCategory, "The exported catalog has no categories");

      await page.goto(path);

      await expect(
        page.getByRole("heading", { level: 1, name: detailCategory.name }),
      ).toBeVisible();
      if (detailCategory.description) {
        await expect(page.getByText(detailCategory.description)).toBeVisible();
      }
      await expect(page.getByTestId("product-card")).toHaveCount(
        categoryProducts(detailCategory).length,
      );
      for (const product of categoryProducts(detailCategory)) {
        await expect(page.getByText(product.name)).toBeVisible();
      }
    });

    test("shows the breadcrumb trail to the category", async ({ page }) => {
      test.skip(!detailCategory, "The exported catalog has no categories");

      await page.goto(path);

      const breadcrumb = page.getByRole("navigation", { name: "breadcrumb" });
      await expect(
        breadcrumb.getByRole("link", { name: /Inicio|Home/ }),
      ).toHaveAttribute("href", `/${locale}/`);
      await expect(
        breadcrumb.getByRole("link", { name: /Categorías|Categories/ }),
      ).toHaveAttribute("href", `/${locale}/categories/`);
      await expect(breadcrumb.getByText(detailCategory.name)).toBeVisible();
    });

    test("links back to the localized products page", async ({ page }) => {
      test.skip(!detailCategory, "The exported catalog has no categories");

      await page.goto(path);

      await expect(
        page.getByRole("link", { name: new RegExp(backToProducts) }),
      ).toHaveAttribute("href", productsPagePath(locale, 1));
    });
  });
}

const indexPages = [
  { locale: "es", path: "/es/categories/", heading: "Categorías" },
  { locale: "en", path: "/en/categories/", heading: "Categories" },
] as const;

for (const { locale, path, heading } of indexPages) {
  test.describe(`categories index at ${path}`, () => {
    test("lists every category in the catalog", async ({ page }) => {
      await page.goto(path);

      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      await expect(page.getByTestId("category-card")).toHaveCount(
        categories.length,
      );
      for (const category of categories.slice(0, 2)) {
        await expect(
          page.getByRole("link", {
            name: new RegExp(`^${escapeRegExp(category.name)}(?=\\s|$)`),
          }),
        ).toBeVisible();
      }
    });

    test("opens a category from its card", async ({ page }) => {
      test.skip(!detailCategory, "The exported catalog has no categories");

      await page.goto(path);

      await page
        .getByTestId("category-card")
        .filter({ hasText: detailCategory.name })
        .click();

      await expect(page).toHaveURL(
        new RegExp(`${escapeRegExp(categoryPath(detailCategory, locale))}$`),
      );
      await expect(
        page.getByRole("heading", { level: 1, name: detailCategory.name }),
      ).toBeVisible();
    });
  });
}

test("opens a category page from the product detail badges", async ({
  page,
}) => {
  test.skip(!multiCategoryProduct, "No exported product belongs to a category");

  const category = productCategories(multiCategoryProduct)[0];
  await page.goto(productPath(multiCategoryProduct, "es"));

  await page.getByRole("link", { name: category.name }).click();

  await expect(page).toHaveURL(
    new RegExp(`${escapeRegExp(categoryPath(category, "es"))}$`),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: category.name }),
  ).toBeVisible();
});

test("shows every category a product belongs to", async ({ page }) => {
  test.skip(
    !multiCategoryProduct,
    "No exported product belongs to several categories",
  );

  await page.goto(productPath(multiCategoryProduct, "es"));

  for (const category of productCategories(multiCategoryProduct)) {
    await expect(
      page.getByRole("link", { name: category.name }),
    ).toHaveAttribute("href", categoryPath(category, "es"));
  }
});

test("lists a multi-category product under each of its categories", async ({
  page,
}) => {
  test.skip(
    !multiCategoryProduct,
    "No exported product belongs to several categories",
  );

  for (const category of productCategories(multiCategoryProduct)) {
    await page.goto(categoryPath(category, "es"));
    await expect(page.getByText(multiCategoryProduct.name)).toBeVisible();
    await expect(page.getByTestId("product-card")).toHaveCount(
      categoryProducts(category).length,
    );
  }
});

test("shows every category badge on a multi-category product card", async ({
  page,
}) => {
  test.skip(
    !multiCategoryProduct,
    "No exported product belongs to several categories",
  );

  const category = productCategories(multiCategoryProduct)[0];
  await page.goto(categoryPath(category, "es"));

  const card = page
    .getByTestId("product-card")
    .filter({ hasText: multiCategoryProduct.name });
  for (const badge of productCategories(multiCategoryProduct)) {
    await expect(card.getByText(badge.name)).toBeVisible();
  }
});

test("shows the product breadcrumb trail", async ({ page }) => {
  test.skip(!breadcrumbProduct, "The exported catalog has no products");

  await page.goto(productPath(breadcrumbProduct, "es"));

  const breadcrumb = page.getByRole("navigation", { name: "breadcrumb" });
  await expect(
    breadcrumb.getByRole("link", { name: "Inicio" }),
  ).toHaveAttribute("href", "/es/");
  await expect(
    breadcrumb.getByRole("link", { name: "Productos" }),
  ).toHaveAttribute("href", "/es/products/");
  await expect(breadcrumb.getByText(breadcrumbProduct.name)).toBeVisible();
});

test("browses the product image gallery", async ({ page }) => {
  test.skip(!galleryProduct, "No exported product has several images");

  await page.goto(productPath(galleryProduct, "es"));
  await waitForEditorHydration(page);

  const count = productImageCount(galleryProduct);
  await expect(
    page.getByRole("button", { name: `Show image 1 of ${count}` }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: `Show image 2 of ${count}` }).click();
  await expect(
    page.getByRole("button", { name: `Show image 2 of ${count}` }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("renders a product whose folder does not match its category", async ({
  page,
}) => {
  test.skip(!unfiled, "Every exported product is filed under its category");

  await page.goto(categoryPath(unfiled.category, "es"));

  await expect(page.getByTestId("product-card")).toHaveCount(
    categoryProducts(unfiled.category).length,
  );
  await expect(page.getByText(unfiled.product.name)).toBeVisible();
});
