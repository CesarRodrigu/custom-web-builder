/**
 * Site-wide constants shared by the Astro config, the layout, the head, the
 * sitemap, and the pages; `astro.config.mjs` imports them so every locale is
 * declared once.
 */
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

/**
 * Localized labels rendered by the common header and footer of the layout.
 *
 * Every page texts object includes this contract so the base layout can draw
 * the same site shell around all pages without knowing the page-specific copy.
 */
export interface SiteLayoutTexts {
  /** Label of the home navigation link. */
  navHome: string;
  /** Label of the products navigation link. */
  navProducts: string;
  /** Label of the categories navigation link. */
  navCategories: string;
  /** Label shown before the contact email in the footer. */
  footerContact: string;
  /** Copyright notice shown in the footer. */
  footerRights: string;
}
