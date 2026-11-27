import { expect, test } from "@playwright/test";

import { escapeRegExp, site } from "@tests/e2e/content";

const pages = [
  {
    path: "/",
    lang: "es",
    title: `Página de inicio | ${site.name}`,
    description: site.description,
    canonical: "/es/",
    navHome: "Inicio",
    navProducts: "Productos",
    footerRights: "Todos los derechos reservados.",
  },
  {
    path: "/es/",
    lang: "es",
    title: `Página de inicio | ${site.name}`,
    description: site.description,
    canonical: "/es/",
    navHome: "Inicio",
    navProducts: "Productos",
    footerRights: "Todos los derechos reservados.",
  },
  {
    path: "/en/",
    lang: "en",
    title: `Home page | ${site.name}`,
    description: site.description,
    canonical: "/en/",
    navHome: "Home",
    navProducts: "Products",
    footerRights: "All rights reserved.",
  },
  {
    path: "/es/products/",
    lang: "es",
    title: `Productos | ${site.name}`,
    description: "Todos los productos disponibles, organizados por categoría.",
    canonical: "/es/products/page/1/",
    navHome: "Inicio",
    navProducts: "Productos",
    footerRights: "Todos los derechos reservados.",
  },
  {
    path: "/en/products/",
    lang: "en",
    title: `Products | ${site.name}`,
    description: "Every product in the catalog, organized by category.",
    canonical: "/en/products/page/1/",
    navHome: "Home",
    navProducts: "Products",
    footerRights: "All rights reserved.",
  },
  {
    path: "/es/products/page/1/",
    lang: "es",
    title: `Productos | ${site.name}`,
    description: "Todos los productos disponibles, organizados por categoría.",
    canonical: "/es/products/page/1/",
    navHome: "Inicio",
    navProducts: "Productos",
    footerRights: "Todos los derechos reservados.",
  },
  {
    path: "/en/products/page/1/",
    lang: "en",
    title: `Products | ${site.name}`,
    description: "Every product in the catalog, organized by category.",
    canonical: "/en/products/page/1/",
    navHome: "Home",
    navProducts: "Products",
    footerRights: "All rights reserved.",
  },
];

for (const {
  path,
  lang,
  title,
  description,
  canonical,
  navHome,
  navProducts,
  footerRights,
} of pages) {
  test.describe(`page at ${path}`, () => {
    test("renders the document through the shared layout", async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveTitle(title);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
    });

    test("renders the header and the footer from the shared layout", async ({
      page,
    }) => {
      await page.goto(path);

      const header = page.getByRole("banner");
      await expect(
        header.getByRole("link", { name: site.name, exact: true }),
      ).toBeVisible();

      const navigation = header.getByRole("navigation");
      await expect(
        navigation.getByRole("link", { name: navHome, exact: true }),
      ).toBeVisible();
      await expect(
        navigation.getByRole("link", { name: navProducts, exact: true }),
      ).toBeVisible();

      const footer = page.getByRole("contentinfo");
      await expect(footer).toContainText(footerRights);
      if (site.contactEmail) {
        await expect(
          footer.getByRole("link", {
            name: new RegExp(escapeRegExp(site.contactEmail)),
          }),
        ).toBeVisible();
      } else {
        await expect(footer.locator('a[href^="mailto:"]')).toHaveCount(0);
      }
    });

    test("includes the metadata of the shared head", async ({ page }) => {
      await page.goto(path);

      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        description,
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        new RegExp(`${canonical}$`),
      );
    });
  });
}
