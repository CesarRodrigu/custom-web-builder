/**
 * Helpers shared by the end-to-end specs.
 */
import type { Page } from "@playwright/test";

/**
 * Waits until the configuration editor island has hydrated, so every
 * interaction goes through React instead of racing the static server markup.
 *
 * Astro marks islands with an `ssr` attribute until hydration completes. The
 * page also renders a toast island, which can hydrate first, so the wait must
 * target the editor island by its component URL.
 * @param page Playwright page showing the editor.
 */
export async function waitForEditorHydration(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const island = document.querySelector(
      'astro-island[component-url*="ConfigEditor"]',
    );
    return island !== null && !island.hasAttribute("ssr");
  });
}
