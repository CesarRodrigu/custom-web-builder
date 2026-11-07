import { DARK_THEME_CLASS, THEME_STORAGE_KEY, Theme } from "@/config/theme";
import { describe, expect, it } from "vitest";

describe("theme config", () => {
  it("exposes exactly the supported preferences in declaration order", () => {
    const preferences: Theme[] = Object.values(Theme);

    expect(preferences).toEqual(["light", "dark", "system"]);
  });

  it("uses unique values so no preference shadows another", () => {
    const preferences = Object.values(Theme);

    expect(new Set(preferences).size).toBe(preferences.length);
  });

  it.each([
    {
      name: "the light preference",
      preference: Theme.Light,
      expected: "light",
    },
    {
      name: "the dark preference",
      preference: Theme.Dark,
      expected: "dark",
    },
    {
      name: "the system preference",
      preference: Theme.System,
      expected: "system",
    },
  ])(
    "keeps the persisted value of $name stable across releases",
    ({ preference, expected }) => {
      expect(preference).toBe(expected);
    },
  );

  it("persists the preference under the 'theme' key", () => {
    expect(THEME_STORAGE_KEY).toBe("theme");
  });

  it("toggles the class of the dark preference on the document root", () => {
    expect(DARK_THEME_CLASS).toBe(Theme.Dark);
  });
});
