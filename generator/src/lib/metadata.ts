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
