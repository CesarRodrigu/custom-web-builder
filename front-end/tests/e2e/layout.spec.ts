import { expect, test } from "@playwright/test";

const SITE_NAME = "Dulce Hogar";
const SITE_DESCRIPTION =
  "Panadería artesanal con masa madre, bollería y postres horneados cada día.";

const pages = [
  {
    path: "/",
    lang: "es",
    title: `Página de inicio | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    canonical: "/es/",
    navHome: "Inicio",
    navProducts: "Productos",
    footerRights: "Todos los derechos reservados.",
  },
  {
    path: "/es/",
    lang: "es",
    title: `Página de inicio | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    canonical: "/es/",
    navHome: "Inicio",
    navProducts: "Productos",
    footerRights: "Todos los derechos reservados.",
  },
  {
    path: "/en/",
    lang: "en",
    title: `Home page | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    canonical: "/en/",
    navHome: "Home",
    navProducts: "Products",
    footerRights: "All rights reserved.",
  },
  {
    path: "/es/products/",
    lang: "es",
    title: `Productos | ${SITE_NAME}`,
    description: "Todos los productos disponibles, organizados por categoría.",
    canonical: "/es/products/page/1/",
    navHome: "Inicio",
    navProducts: "Productos",
    footerRights: "Todos los derechos reservados.",
  },
  {
    path: "/en/products/",
    lang: "en",
    title: `Products | ${SITE_NAME}`,
    description: "Every product in the catalog, organized by category.",
    canonical: "/en/products/page/1/",
    navHome: "Home",
    navProducts: "Products",
    footerRights: "All rights reserved.",
  },
  {
    path: "/es/products/page/1/",
    lang: "es",
    title: `Productos | ${SITE_NAME}`,
    description: "Todos los productos disponibles, organizados por categoría.",
    canonical: "/es/products/page/1/",
    navHome: "Inicio",
    navProducts: "Productos",
    footerRights: "Todos los derechos reservados.",
  },
  {
    path: "/en/products/page/1/",
    lang: "en",
    title: `Products | ${SITE_NAME}`,
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
        header.getByRole("link", { name: SITE_NAME, exact: true }),
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
      await expect(
        footer.getByRole("link", { name: /hola@dulcehogar\.example/ }),
      ).toBeVisible();
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
