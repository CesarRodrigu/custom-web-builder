import { buildTitle, toSlug } from "@/lib/metadata";
import { describe, expect, it } from "vitest";

describe("buildTitle", () => {
  it("composes the title with the 'Page | Site' pattern", () => {
    expect(buildTitle("Generator", "Home")).toBe("Home | Generator");
  });

  it("returns only the site name when no page title is provided", () => {
    expect(buildTitle("Generator")).toBe("Generator");
    expect(buildTitle("Generator", undefined)).toBe("Generator");
  });

  it("ignores blank page titles so the separator is not left hanging", () => {
    expect(buildTitle("Generator", "")).toBe("Generator");
    expect(buildTitle("Generator", "   ")).toBe("Generator");
  });

  it("trims extra whitespace from both the site and the page title", () => {
    expect(buildTitle("  Generator  ", "  About  ")).toBe("About | Generator");
  });
});

describe("toSlug", () => {
  it("converts a title into a URL slug", () => {
    expect(toSlug("About us page")).toBe("about-us-page");
  });

  it("removes accents and other diacritic characters", () => {
    expect(toSlug("Electronic music")).toBe("electronic-music");
    expect(toSlug("señal")).toBe("senal");
  });

  it("replaces punctuation and runs of spaces with a single hyphen", () => {
    expect(toSlug("What is  Astro?!")).toBe("what-is-astro");
  });

  it("strips leading and trailing hyphens", () => {
    expect(toSlug("  --hello world--  ")).toBe("hello-world");
  });

  it("returns an empty string when no alphanumeric content remains", () => {
    expect(toSlug("!!!")).toBe("");
  });

  it("handles already-normalized text without duplicating separators", () => {
    expect(toSlug("astro")).toBe("astro");
    expect(toSlug("a-b-c")).toBe("a-b-c");
  });
});
