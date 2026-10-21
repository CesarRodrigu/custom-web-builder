import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y-x";
import jsdoc from "eslint-plugin-jsdoc";

const jsxFiles = ["**/*.{jsx,tsx}"];

export default defineConfig(
  { ignores: ["{dist,.astro,playwright-report,test-results,coverage}/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs["flat/recommended"],
  ...astro.configs["flat/jsx-a11y-recommended"],
  {
    ...jsdoc.configs["flat/recommended-typescript-flavor-error"],
    files: ["**/*.{js,jsx,cjs,mjs}"],
  },
  {
    ...jsdoc.configs["flat/recommended-typescript-error"],
    files: ["**/*.{ts,tsx,cts,mts}"],
  },
  { files: jsxFiles, ...reactHooks.configs.flat["recommended-latest"] },
  { files: jsxFiles, ...jsxA11y.configs.recommended },
  {
    files: ["**/*.{js,mjs,ts,tsx,astro}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["..", "../*", ".", "./*"],
              message:
                "Relative imports are not allowed. Use the `@/` alias (e.g. `@/lib/metadata`).",
            },
          ],
        },
      ],
    },
  },
);
