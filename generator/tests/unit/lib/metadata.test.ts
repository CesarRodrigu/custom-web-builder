import { buildLocaleAlternates, buildTitle, toSlug } from "@/lib/metadata";
import { describe, expect, it } from "vitest";

describe("buildTitle", () => {
  it.each([
    {
      name: "composes the title with the 'Page | Site' pattern",
      pageTitle: "Home",
      expected: "Home | Generator",
    },
    {
      name: "ignores an undefined page title",
      pageTitle: undefined,
      expected: "Generator",
    },
    {
      name: "ignores an empty page title",
      pageTitle: "",
      expected: "Generator",
    },
    {
      name: "ignores a whitespace-only page title",
      pageTitle: "   ",
      expected: "Generator",
    },
  ])("$name", ({ pageTitle, expected }) => {
    expect(buildTitle("Generator", pageTitle)).toBe(expected);
  });

  it("returns only the site name when no page title argument is given", () => {
    expect(buildTitle("Generator")).toBe("Generator");
  });

  it("trims extra whitespace from both the site and the page title", () => {
    expect(buildTitle("  Generator  ", "  About  ")).toBe("About | Generator");
  });
});

describe("toSlug", () => {
  it.each([
    {
      name: "converts a title into a URL slug",
      text: "About us page",
      expected: "about-us-page",
    },
    {
      name: "removes accents and other diacritic characters",
      text: "señal",
      expected: "senal",
    },
    {
      name: "keeps plain ASCII words untouched",
      text: "Electronic music",
      expected: "electronic-music",
    },
    {
      name: "replaces punctuation and runs of spaces with a single hyphen",
      text: "What is  Astro?!",
      expected: "what-is-astro",
    },
    {
      name: "strips leading and trailing hyphens",
      text: "  --hello world--  ",
      expected: "hello-world",
    },
    {
      name: "returns an empty string when no alphanumeric content remains",
      text: "!!!",
      expected: "",
    },
    {
      name: "handles already-normalized text without duplicating separators",
      text: "astro",
      expected: "astro",
    },
    {
      name: "keeps existing hyphens between words",
      text: "a-b-c",
      expected: "a-b-c",
    },
  ])("$name", ({ text, expected }) => {
    expect(toSlug(text)).toBe(expected);
  });
});

describe("buildLocaleAlternates", () => {
  const spanishAndEnglish = {
    locales: ["es", "en"],
    hreflang: { es: "es-ES", en: "en-US" },
    site: "https://example.com",
  };

  it.each([
    {
      name: "maps the root path to the home page of every locale",
      ...spanishAndEnglish,
      pathname: "/",
      expected: {
        "es-ES": "https://example.com/es",
        "en-US": "https://example.com/en",
        "x-default": "https://example.com/es",
      },
    },
    {
      name: "removes the locale prefix so every locale points to the same page",
      ...spanishAndEnglish,
      pathname: "/en/blog/post/",
      expected: {
        "es-ES": "https://example.com/es/blog/post",
        "en-US": "https://example.com/en/blog/post",
        "x-default": "https://example.com/es/blog/post",
      },
    },
    {
      name: "prefixes pages that are not under a locale segment",
      ...spanishAndEnglish,
      pathname: "/blog/",
      expected: {
        "es-ES": "https://example.com/es/blog",
        "en-US": "https://example.com/en/blog",
        "x-default": "https://example.com/es/blog",
      },
    },
    {
      name: "points x-default at the default locale, whichever is listed first",
      locales: ["en", "es"],
      hreflang: { en: "en-US", es: "es-ES" },
      site: "https://example.com",
      pathname: "/es/",
      expected: {
        "en-US": "https://example.com/en",
        "es-ES": "https://example.com/es",
        "x-default": "https://example.com/en",
      },
    },
    {
      name: "falls back to the locale code when it has no hreflang value",
      locales: ["es"],
      hreflang: {} as Record<string, string>,
      site: "https://example.com",
      pathname: "/",
      expected: {
        es: "https://example.com/es",
        "x-default": "https://example.com/es",
      },
    },
    {
      name: "accepts a URL instance as the base",
      locales: ["es"],
      hreflang: { es: "es-ES", en: "en-US" },
      site: new URL("https://example.com"),
      pathname: "/",
      expected: {
        "es-ES": "https://example.com/es",
        "x-default": "https://example.com/es",
      },
    },
    {
      name: "returns an empty record when no locale is configured",
      locales: [],
      hreflang: { es: "es-ES", en: "en-US" },
      site: "https://example.com",
      pathname: "/",
      expected: {},
    },
  ])("$name", ({ pathname, locales, hreflang, site, expected }) => {
    expect(buildLocaleAlternates(pathname, locales, hreflang, site)).toEqual(
      expected,
    );
  });
});
