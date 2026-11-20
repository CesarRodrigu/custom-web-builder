import { expect, test } from "@playwright/test";

import { waitForEditorHydration } from "@tests/e2e/helpers";

const categoryPages = [
  {
    locale: "es",
    path: "/es/categories/panes/",
    heading: "Panes",
    description: "Hogazas y barras de fermentación lenta.",
    backToProducts: "Volver a productos",
  },
  {
    locale: "en",
    path: "/en/categories/panes/",
    heading: "Panes",
    description: "Hogazas y barras de fermentación lenta.",
    backToProducts: "Back to products",
  },
];

for (const {
  locale,
  path,
  heading,
  description,
  backToProducts,
} of categoryPages) {
  test.describe(`category page at ${path}`, () => {
    test("renders the products the category references", async ({ page }) => {
      await page.goto(path);

      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      await expect(page.getByText(description)).toBeVisible();
      await expect(page.getByTestId("product-card")).toHaveCount(2);
      await expect(page.getByText("Baguette")).toBeVisible();
      await expect(page.getByText("Pan de masa madre")).toBeVisible();
    });

    test("shows the breadcrumb trail to the category", async ({ page }) => {
      await page.goto(path);

      const breadcrumb = page.getByRole("navigation", { name: "breadcrumb" });
      await expect(
        breadcrumb.getByRole("link", { name: /Inicio|Home/ }),
      ).toHaveAttribute("href", `/${locale}/`);
      await expect(
        breadcrumb.getByRole("link", { name: /Categorías|Categories/ }),
      ).toHaveAttribute("href", `/${locale}/categories/`);
      await expect(breadcrumb.getByText(heading)).toBeVisible();
    });

    test("links back to the localized products page", async ({ page }) => {
      await page.goto(path);

      await expect(
        page.getByRole("link", { name: new RegExp(backToProducts) }),
      ).toHaveAttribute("href", `/${locale}/products/`);
    });
  });
}

const categoryIndexPages = [
  { locale: "es", path: "/es/categories/", heading: "Categorías" },
  { locale: "en", path: "/en/categories/", heading: "Categories" },
];

for (const { locale, path, heading } of categoryIndexPages) {
  test.describe(`categories index at ${path}`, () => {
    test("lists every category in the catalog", async ({ page }) => {
      await page.goto(path);

      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      await expect(page.getByTestId("category-card")).toHaveCount(6);
      await expect(page.getByRole("link", { name: /^Panes\b/ })).toBeVisible();
      await expect(
        page.getByRole("link", { name: /^Desayuno\b/ }),
      ).toBeVisible();
    });

    test("opens a category from its card", async ({ page }) => {
      await page.goto(path);

      await page
        .getByTestId("category-card")
        .filter({ hasText: "Panes" })
        .click();

      await expect(page).toHaveURL(
        new RegExp(`/${locale}/categories/panes/?$`),
      );
      await expect(
        page.getByRole("heading", { level: 1, name: "Panes" }),
      ).toBeVisible();
    });
  });
}

test("opens a category page from the product detail badges", async ({
  page,
}) => {
  await page.goto("/es/products/panes/baguette/");

  await page.getByRole("link", { name: "Panes" }).click();

  await expect(page).toHaveURL(/\/es\/categories\/panes\/?$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Panes" }),
  ).toBeVisible();
});

test("shows every category a product belongs to", async ({ page }) => {
  await page.goto("/es/products/panes/baguette/");

  const panesLink = page.getByRole("link", { name: "Panes" });
  const desayunoLink = page.getByRole("link", { name: "Desayuno" });

  await expect(panesLink).toHaveAttribute("href", "/es/categories/panes/");
  await expect(desayunoLink).toHaveAttribute(
    "href",
    "/es/categories/desayuno/",
  );
});

test("lists a multi-category product under each of its categories", async ({
  page,
}) => {
  await page.goto("/es/categories/panes/");
  await expect(page.getByText("Baguette")).toBeVisible();

  await page.goto("/es/categories/desayuno/");
  await expect(page.getByTestId("product-card")).toHaveCount(2);
  await expect(page.getByText("Baguette")).toBeVisible();
  await expect(page.getByText("Croissant de mantequilla")).toBeVisible();
});

test("shows every category badge on a multi-category product card", async ({
  page,
}) => {
  await page.goto("/es/categories/desayuno/");

  const baguetteCard = page
    .getByTestId("product-card")
    .filter({ hasText: "Baguette" });

  await expect(baguetteCard.getByText("Panes")).toBeVisible();
  await expect(baguetteCard.getByText("Desayuno")).toBeVisible();
});

test("shows the product breadcrumb trail", async ({ page }) => {
  await page.goto("/es/products/panes/baguette/");

  const breadcrumb = page.getByRole("navigation", { name: "breadcrumb" });
  await expect(
    breadcrumb.getByRole("link", { name: "Inicio" }),
  ).toHaveAttribute("href", "/es/");
  await expect(
    breadcrumb.getByRole("link", { name: "Productos" }),
  ).toHaveAttribute("href", "/es/products/");
  await expect(breadcrumb.getByText("Baguette")).toBeVisible();
});

test("browses the product image gallery", async ({ page }) => {
  await page.goto("/es/products/panes/baguette/");
  await waitForEditorHydration(page);

  await expect(
    page.getByRole("button", { name: "Show image 1 of 3" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Show image 2 of 3" }).click();
  await expect(
    page.getByRole("button", { name: "Show image 2 of 3" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("renders a product without a matching folder under its category", async ({
  page,
}) => {
  await page.goto("/es/categories/salados/");

  await expect(page.getByTestId("product-card")).toHaveCount(1);
  await expect(page.getByText("Empanada gallega")).toBeVisible();
});
