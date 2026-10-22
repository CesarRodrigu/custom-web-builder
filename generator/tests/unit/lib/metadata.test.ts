import { buildLocaleAlternates, buildTitle, toSlug } from "@/lib/metadata";
import { describe, expect, it } from "vitest";

describe("buildTitle", () => {
  it("composes the title with the 'Page | Site' pattern", () => {
    const siteName = "Generator";
    const pageTitle = "Home";

    const title = buildTitle(siteName, pageTitle);

    expect(title).toBe("Home | Generator");
  });

  it("returns only the site name when no page title is provided", () => {
    const siteName = "Generator";

    const withoutPageTitle = buildTitle(siteName);
    const withUndefinedPageTitle = buildTitle(siteName, undefined);

    expect(withoutPageTitle).toBe("Generator");
    expect(withUndefinedPageTitle).toBe("Generator");
  });

  it("ignores blank page titles so the separator is not left hanging", () => {
    const siteName = "Generator";

    const withEmptyPageTitle = buildTitle(siteName, "");
    const withWhitespacePageTitle = buildTitle(siteName, "   ");

    expect(withEmptyPageTitle).toBe("Generator");
    expect(withWhitespacePageTitle).toBe("Generator");
  });

  it("trims extra whitespace from both the site and the page title", () => {
    const siteName = "  Generator  ";
    const pageTitle = "  About  ";

    const title = buildTitle(siteName, pageTitle);

    expect(title).toBe("About | Generator");
  });
});

describe("toSlug", () => {
  it("converts a title into a URL slug", () => {
    const text = "About us page";

    const slug = toSlug(text);

    expect(slug).toBe("about-us-page");
  });

  it("removes accents and other diacritic characters", () => {
    const electronicMusic = "Electronic music";
    const senal = "señal";

    const electronicMusicSlug = toSlug(electronicMusic);
    const senalSlug = toSlug(senal);

    expect(electronicMusicSlug).toBe("electronic-music");
    expect(senalSlug).toBe("senal");
  });

  it("replaces punctuation and runs of spaces with a single hyphen", () => {
    const text = "What is  Astro?!";

    const slug = toSlug(text);

    expect(slug).toBe("what-is-astro");
  });

  it("strips leading and trailing hyphens", () => {
    const text = "  --hello world--  ";

    const slug = toSlug(text);

    expect(slug).toBe("hello-world");
  });

  it("returns an empty string when no alphanumeric content remains", () => {
    const text = "!!!";

    const slug = toSlug(text);

    expect(slug).toBe("");
  });

  it("handles already-normalized text without duplicating separators", () => {
    const singleWord = "astro";
    const hyphenated = "a-b-c";

    const singleWordSlug = toSlug(singleWord);
    const hyphenatedSlug = toSlug(hyphenated);

    expect(singleWordSlug).toBe("astro");
    expect(hyphenatedSlug).toBe("a-b-c");
  });
});

describe("buildLocaleAlternates", () => {
  it("maps the root path to the home page of every locale", () => {
    const pathname = "/";
    const locales = ["es", "en"];
    const hreflang = { es: "es-ES", en: "en-US" };
    const site = "https://example.com";

    const alternates = buildLocaleAlternates(pathname, locales, hreflang, site);

    expect(alternates).toEqual({
      "es-ES": "https://example.com/es",
      "en-US": "https://example.com/en",
      "x-default": "https://example.com/es",
    });
  });

  it("removes the locale prefix so every locale points to the same page", () => {
    const pathname = "/en/blog/post/";
    const locales = ["es", "en"];
    const hreflang = { es: "es-ES", en: "en-US" };
    const site = "https://example.com";

    const alternates = buildLocaleAlternates(pathname, locales, hreflang, site);

    expect(alternates).toEqual({
      "es-ES": "https://example.com/es/blog/post",
      "en-US": "https://example.com/en/blog/post",
      "x-default": "https://example.com/es/blog/post",
    });
  });

  it("prefixes pages that are not under a locale segment", () => {
    const pathname = "/blog/";
    const locales = ["es", "en"];
    const hreflang = { es: "es-ES", en: "en-US" };
    const site = "https://example.com";

    const alternates = buildLocaleAlternates(pathname, locales, hreflang, site);

    expect(alternates).toEqual({
      "es-ES": "https://example.com/es/blog",
      "en-US": "https://example.com/en/blog",
      "x-default": "https://example.com/es/blog",
    });
  });

  it("points x-default at the default locale, whichever is listed first", () => {
    const pathname = "/es/";
    const locales = ["en", "es"];
    const hreflang = { en: "en-US", es: "es-ES" };
    const site = "https://example.com";

    const alternates = buildLocaleAlternates(pathname, locales, hreflang, site);

    expect(alternates["x-default"]).toBe("https://example.com/en");
  });

  it("falls back to the locale code when it has no hreflang value", () => {
    const pathname = "/";
    const locales = ["es"];
    const hreflang = {};
    const site = "https://example.com";

    const alternates = buildLocaleAlternates(pathname, locales, hreflang, site);

    expect(alternates["es"]).toBe("https://example.com/es");
  });

  it("accepts a URL instance as the base", () => {
    const pathname = "/";
    const locales = ["es"];
    const hreflang = { es: "es-ES", en: "en-US" };
    const site = new URL("https://example.com");

    const alternates = buildLocaleAlternates(pathname, locales, hreflang, site);

    expect(alternates["es-ES"]).toBe("https://example.com/es");
  });

  it("returns an empty record when no locale is configured", () => {
    const pathname = "/";
    const locales: string[] = [];
    const hreflang = { es: "es-ES", en: "en-US" };
    const site = "https://example.com";

    const alternates = buildLocaleAlternates(pathname, locales, hreflang, site);

    expect(alternates).toEqual({});
  });
});
