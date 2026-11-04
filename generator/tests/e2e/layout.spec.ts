import { expect, test } from "@playwright/test";

const pages = [
  {
    path: "/",
    lang: "es",
    title: "Página de inicio | Custom Web Builder",
    description: "Website generator: pagina-de-inicio",
    canonical: /\/$/,
  },
  {
    path: "/es/",
    lang: "es",
    title: "Página de inicio | Custom Web Builder",
    description: "Website generator: pagina-de-inicio",
    canonical: /\/es\/$/,
  },
  {
    path: "/en/",
    lang: "en",
    title: "Home page | Custom Web Builder",
    description: "Website generator: home-page",
    canonical: /\/en\/$/,
  },
];

for (const { path, lang, title, description, canonical } of pages) {
  test.describe(`home page at ${path}`, () => {
    test("renders the document through the shared layout", async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveTitle(title);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(
        page.getByText("Custom Web Builder", { exact: true }),
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
        canonical,
      );
    });
  });
}
