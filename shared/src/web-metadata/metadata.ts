/**
 * Composes the `<title>` of a page following the "Page | Site" pattern.
 *
 * When the page title is missing (or blank), it returns only the site name
 * so the separator is never left dangling at the end.
 * @param siteName Display name of the site, used as the right-hand side.
 * @param pageTitle Title of the current page; blank values are ignored.
 * @returns The composed "Page | Site" title, or only the site name.
 */
export function buildTitle(siteName: string, pageTitle?: string): string {
  const site = siteName.trim();
  const page = pageTitle?.trim();

  if (!page) {
    return site;
  }

  return `${page} | ${site}`;
}

/**
 * Converts a text into a valid URL slug.
 *
 * Normalizes accents, lowercases the text, replaces any run of
 * non-alphanumeric characters with a hyphen, and strips the leading
 * and trailing hyphens.
 * @param text Raw text, possibly with accents, punctuation, and spacing.
 * @returns Lowercase slug without leading or trailing hyphens; empty string
 * when no alphanumeric character remains.
 */
export function toSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds the `hreflang` alternate URLs of a page for every supported locale.
 *
 * A leading locale segment in the pathname (e.g. `/en/blog`) is removed so
 * each locale points to its own version of the same page, and an `x-default`
 * entry points at the same page in the default locale (the first in the list).
 * @param pathname Request path of the current page, always starting with `/`.
 * @param locales Supported locale codes in preference order; the first is the default.
 * @param hreflang `hreflang` value of each locale, as declared in the site config.
 * @param site Absolute base URL of the site (the production domain).
 * @returns Absolute alternate URLs keyed by `hreflang` value, plus an `x-default` key;
 * an empty record when `locales` has no entries.
 */
export function buildLocaleAlternates(
  pathname: string,
  locales: readonly string[],
  hreflang: Readonly<Record<string, string>>,
  site: URL | string,
): Record<string, string> {
  if (locales.length === 0) {
    return {};
  }

  const segments = pathname.split("/").filter(Boolean);
  const hasLocalePrefix = locales.includes(segments[0]);
  const pagePath = hasLocalePrefix
    ? segments.slice(1).join("/")
    : segments.join("/");
  const alternates: Record<string, string> = {};

  for (const locale of locales) {
    const path = [locale, pagePath].filter(Boolean).join("/");
    alternates[hreflang[locale] ?? locale] = new URL(`/${path}`, site).href;
  }

  const defaultLang = hreflang[locales[0]] ?? locales[0];
  alternates["x-default"] = alternates[defaultLang];

  return alternates;
}
