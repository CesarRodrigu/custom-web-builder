import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import jsdoc from "eslint-plugin-jsdoc";
import globals from "globals";

const exportedMemberDocs = {
  "jsdoc/require-jsdoc": [
    "error",
    {
      contexts: [
        "ExportNamedDeclaration:has(> VariableDeclaration)",
        "ExportNamedDeclaration > TSInterfaceDeclaration",
        "ExportNamedDeclaration > TSTypeAliasDeclaration",
        "ExportNamedDeclaration > TSEnumDeclaration",
        "ExportNamedDeclaration > ClassDeclaration",
      ],
    },
  ],
};

export default defineConfig(
  {
    ignores: ["{coverage,node_modules}/"],
  },
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ...jsdoc.configs["flat/recommended-typescript-error"],
    files: ["**/*.{ts,mts,cts}"],
    rules: {
      ...jsdoc.configs["flat/recommended-typescript-error"].rules,
      ...exportedMemberDocs,
    },
  },
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
                "Relative imports are not allowed. Use the `@/` alias (e.g. `@/lib/catalog`).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["vitest.config.ts"],
    languageOptions: { globals: globals.node },
  },
);
