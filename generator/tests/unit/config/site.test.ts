import { defaultLocale, hreflangCodes, locales, siteName } from "@/config/site";
import type { Locale } from "@/config/site";
import { describe, expect, it } from "vitest";

describe("site config", () => {
  it("exposes the site display name", () => {
    expect(siteName).toBe("Astro");
  });

  it("declares an hreflang code for every supported locale", () => {
    expect(hreflangCodes).toEqual({ es: "es-ES", en: "en-US" });
  });

  it("derives the locale list in declaration order", () => {
    expect(locales).toEqual(["es", "en"]);
  });

  it("uses the first declared locale as the default", () => {
    expect(defaultLocale).toBe("es");
  });

  it("keeps the default locale aligned with the first entry of locales", () => {
    expect(defaultLocale).toBe(locales[0]);
  });

  it("keeps the hreflang keys aligned with the locale list", () => {
    expect(Object.keys(hreflangCodes)).toEqual(locales);
  });

  it("types the default locale as a supported Locale", () => {
    const locale: Locale = defaultLocale;

    expect(locale).toBe("es");
  });
});
