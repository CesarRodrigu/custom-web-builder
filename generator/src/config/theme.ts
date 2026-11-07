/**
 * Theme preferences and the DOM hooks shared by the mode toggle and the
 * inline bootstrap script of the layout.
 *
 * The bootstrap script must run before the first paint to avoid a flash of
 * the wrong palette, so it cannot import this module: the layout passes these
 * values to the script with `define:vars` instead.
 */

/** Theme preference selected by the user. */
export const Theme = {
  /** Always use the light palette. */
  Light: "light",
  /** Always use the dark palette. */
  Dark: "dark",
  /** Follow the operating system preference. */
  System: "system",
} as const;

/** Theme preference selected by the user. */
export type Theme = (typeof Theme)[keyof typeof Theme];

/** `localStorage` key where the resolved theme is persisted. */
export const THEME_STORAGE_KEY = "theme";

/** Class toggled on the document root while the dark palette is active. */
export const DARK_THEME_CLASS = Theme.Dark;
