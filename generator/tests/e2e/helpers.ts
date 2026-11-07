/**
 * Helpers shared by the end-to-end specs.
 */
import type { Page } from "@playwright/test";

/**
 * Waits until the configuration editor island has hydrated, so every
 * interaction goes through React instead of racing the static server markup.
 *
 * Astro marks islands with an `ssr` attribute until hydration completes, so
 * the wait ends exactly when the editor becomes interactive.
 * @param page Playwright page showing the editor.
 */
export async function waitForEditorHydration(page: Page): Promise<void> {
  await page.waitForFunction(
    () => document.querySelectorAll("astro-island:not([ssr])").length > 0,
  );
}
