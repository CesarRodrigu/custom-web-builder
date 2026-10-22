/**
 * Site-wide constants shared by the Astro config, the layout, the head, the
 * sitemap, and the pages; `astro.config.mjs` imports them so every locale is
 * declared once.
 */
/** Display name of the site, used in the page title and the Open Graph tags. */
export const siteName = "Astro";

/**
 * `hreflang` value advertised for each locale, keyed by its URL segment.
 *
 * This is the only place where locales are declared: the URL segments, the
 * locale type, and the default locale are derived from it. The `<head>` and
 * the sitemap read this same map, so both always declare the same languages
 * for the same page.
 */
export const hreflangCodes = {
  es: "es-ES",
  en: "en-US",
} as const;

/** Locale code of every supported language, derived from `hreflangCodes`. */
export type Locale = keyof typeof hreflangCodes;

/** URL segment of every supported locale, in declaration order. */
export const locales = Object.keys(hreflangCodes) as Locale[];

/** First entry of `locales`; the language used when a page does not choose one. */
export const defaultLocale: Locale = locales[0];
