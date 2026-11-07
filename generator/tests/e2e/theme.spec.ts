import { locales } from "@/config/site";
import { DARK_THEME_CLASS, THEME_STORAGE_KEY, Theme } from "@/config/theme";
import { expect, test, type Page } from "@playwright/test";

import { waitForEditorHydration } from "@tests/e2e/helpers";

/**
 * These specs pin the contract the layout bootstrap depends on: the dark
 * class toggled on `<html>` and the theme key stored in `localStorage`.
 */

/** Locales whose pages render the shared editor and its theme toggle. */
const localePaths: string[] = locales.map((locale) => `/${locale}/`);

/**
 * Opens the theme dropdown of the editor top bar.
 * @param page Playwright page showing the editor.
 */
async function openThemeMenu(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Toggle theme" }).click();
}

/**
 * Reads the theme preference the layout persisted in `localStorage`.
 * @param page Playwright page showing the editor.
 * @returns The stored value, or `null` when nothing has been persisted yet.
 */
async function readStoredTheme(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY);
}

/**
 * Records whether the dark class is already applied when the DOM finishes
 * parsing, which is after the inline bootstrap script has run and before the
 * React islands are guaranteed to be hydrated.
 * @param page Playwright page to instrument before navigating.
 */
async function recordThemeAtDomContentLoaded(page: Page): Promise<void> {
  await page.addInitScript((darkClass) => {
    document.addEventListener("DOMContentLoaded", () => {
      (window as unknown as Record<string, boolean>).themeAtDomContentLoaded =
        document.documentElement.classList.contains(darkClass);
    });
  }, DARK_THEME_CLASS);
}

/**
 * Reads the theme captured at `DOMContentLoaded` by the init script.
 * @param page Instrumented Playwright page.
 * @returns Whether the dark class was already present when the DOM was parsed.
 */
async function readThemeAtDomContentLoaded(
  page: Page,
): Promise<boolean | undefined> {
  return page.evaluate(
    () =>
      (window as unknown as Record<string, boolean | undefined>)
        .themeAtDomContentLoaded,
  );
}

test.describe("theme switching", () => {
  for (const path of localePaths) {
    test(`switches the palette from the menu at ${path}`, async ({ page }) => {
      await page.goto(path);
      await waitForEditorHydration(page);

      const html = page.locator("html");
      await expect(html).not.toHaveClass(DARK_THEME_CLASS);
      expect(await readStoredTheme(page)).toBeNull();

      await openThemeMenu(page);
      await page.getByRole("menuitem", { name: "Dark" }).click();
      await expect(html).toHaveClass(DARK_THEME_CLASS);
      await expect.poll(() => readStoredTheme(page)).toBe(Theme.Dark);

      await openThemeMenu(page);
      await page.getByRole("menuitem", { name: "Light" }).click();
      await expect(html).not.toHaveClass(DARK_THEME_CLASS);
      await expect.poll(() => readStoredTheme(page)).toBe(Theme.Light);
    });
  }

  test("keeps the stored palette on reload before the islands hydrate", async ({
    page,
  }) => {
    await recordThemeAtDomContentLoaded(page);
    await page.goto("/es/");
    await waitForEditorHydration(page);

    await openThemeMenu(page);
    await page.getByRole("menuitem", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(DARK_THEME_CLASS);
    await expect.poll(() => readStoredTheme(page)).toBe(Theme.Dark);

    await page.reload();
    await expect(page.locator("html")).toHaveClass(DARK_THEME_CLASS);
    expect(await readThemeAtDomContentLoaded(page)).toBe(true);
  });

  test("follows the operating system preference when System is selected", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: Theme.Dark });
    await page.goto("/es/");
    await waitForEditorHydration(page);

    const html = page.locator("html");
    await expect(html).toHaveClass(DARK_THEME_CLASS);

    await openThemeMenu(page);
    await page.getByRole("menuitem", { name: "Light" }).click();
    await expect(html).not.toHaveClass(DARK_THEME_CLASS);

    await openThemeMenu(page);
    await page.getByRole("menuitem", { name: "System" }).click();
    await expect(html).toHaveClass(DARK_THEME_CLASS);
  });
});
