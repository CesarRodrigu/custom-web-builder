# AGENTS.md — generator

Astro 7 static app that hosts the visual editor for a catalog website and
exports the resulting configuration as a folder tree inside a ZIP.

Read the repository-level `../AGENTS.md` first for the shared conventions; this
file adds what is specific to `generator`.

## Requirements

- Node.js >= 22.12 (CI uses Node 26).
- pnpm with the committed `pnpm-lock.yaml`.
- `SITE_URL` is optional. Without it, the config falls back to
  `http://localhost:4321`; copy `.env.example` to `.env` if you need a real URL.

## Commands

Run everything from `generator/`.

| Command                        | What it does                                         |
| ------------------------------ | ---------------------------------------------------- |
| `pnpm install`                 | Install dependencies (frozen lockfile)               |
| `pnpm dev`                     | Astro dev server on `http://localhost:4321`          |
| `pnpm build`                   | Static production build into `dist/`                 |
| `pnpm preview`                 | Serve the build on `http://localhost:5000`           |
| `pnpm test`                    | Unit tests, then e2e tests                           |
| `pnpm test:unit`               | Vitest, single run                                   |
| `pnpm test:unit:watch`         | Vitest in watch mode                                 |
| `pnpm test:unit:coverage`      | Unit tests with V8 coverage                          |
| `pnpm test:e2e`                | Playwright (builds and previews automatically)       |
| `pnpm test:e2e:chromium`       | Playwright, Chromium project only                    |
| `pnpm test:ui`                 | Playwright UI mode                                   |
| `pnpm test:e2e:debug`          | Playwright debug mode                                |
| `pnpm test:codegen`            | Playwright codegen                                   |
| `pnpm lint` / `lint:fix`       | ESLint (JSDoc, a11y, hooks, no relative imports)     |
| `pnpm format` / `format:check` | Prettier                                             |
| `pnpm check`                   | `lint` + `format:check` + `react-doctor` in parallel |
| `pnpm check:fix`               | `lint:fix` + `format`                                |
| `pnpm check:all`               | `test` + `check` in parallel                         |

Notes:

- Playwright starts `pnpm build && pnpm preview` and uses
  `http://localhost:5000` as `baseURL`. Only Chromium is enabled.
- `react-doctor` runs `pnpx react-doctor@latest --json-compact --yes`, so it
  needs network and may pick up a newer version than the one you ran before.
- Local coverage thresholds are 65% for statements, branches, functions and
  lines. They are intentionally disabled when `CI` is set.

## Structure

```text
src/
  pages/index.astro          Redirects "/" to the default locale (/es/)
  pages/es/index.astro       Spanish page: only the texts object
  pages/en/index.astro       English page: only the texts object
  layouts/BaseLayout.astro   <html>, <head>, theme bootstrap, lang
  components/Head.astro      Title, meta, hreflang and Open Graph tags
  components/Home.astro      Page shell shared by both locales
  components/ModeToggle.tsx  Dark/light toggle island
  components/ui/             shadcn components (generated, not hand-edited)
  features/builder/          Configuration editor island (React)
    ConfigEditor.tsx         Orchestrator: draft state and page selection
    builder-texts.ts         BuilderTexts contract for every locale
    sections/                SiteSection, ProductSection, ExportView
    fields/                  TextField, BigTextField, CategoryField
    layout/                  EditorSidebar, EditorTopBar, TreeViewNode
  lib/catalog/schema.ts      Zod schema, draft types, validation/normalization
  lib/catalog/tree.ts        Preview tree derived from the draft
  lib/catalog/persistence/   DraftPersistence port + localStorage adapter
  lib/export/                Format registry, package builder, ZIP name
  config/site.ts             Locales, hreflang codes, default locale
  config/theme.ts            Theme preferences and DOM hooks shared by React and the inline bootstrap
  styles/global.css          Tailwind 4 entry point and design tokens

tests/unit/                  Mirrors src/ path by path
tests/e2e/                   home.spec.ts, layout.spec.ts, builder.spec.ts
```

### Data flow

1. The user edits a `SiteConfigDraft`, where every field is a raw string.
2. `parseSiteConfig` validates it against the Zod schema and, when valid,
   normalizes it into a `SiteConfig` (trimmed text, omitted optional fields,
   numeric prices). Invalid fields become `FieldIssue` objects with stable
   `ValidationCode`s that the editor maps to localized messages.
3. `buildSiteFileMap` turns a `SiteConfig` into a path/content map:
   `site.<ext>` plus one product file per category path under
   `products/<category>/<subcategory>/`.
4. `ExportView` serializes the map with the selected format and downloads it as
   a ZIP built with JSZip. The archive is always ZIP; only the inner files change
   between JSON and YAML.
5. The draft is persisted through the `DraftPersistence` port. The composition
   root is `lib/catalog/persistence/draft-persistence.ts`; today the adapter uses
   `localStorage`.

Adding a format means adding a module under `lib/export/formats/` and
registering it in `formats/format.ts`. `ExportFormatId` is derived from the
registry, so the type widens automatically.

## Code conventions

- **English only** in code, comments, JSDoc, test names and user-facing keys.
  Visible strings live in the locale files (`es/index.astro`,
  `en/index.astro`) and are typed by `HomeTexts` / `BuilderTexts`.
- **JSDoc is mandatory for exported members.** `eslint-plugin-jsdoc` runs in
  error mode; `pnpm check` fails if a summary, `@param`, `@returns` or
  `@throws` is missing. Do not add types inside `.ts` JSDoc tags
  (`jsdoc/no-types`). Separate the summary from the tags with exactly one blank
  line.
- **Use `@/` for every internal import.** Relative imports (`./`, `../`) are an
  ESLint error.
- **Inherited docs are not duplicated.** If a member implements an interface or
  overrides a base member, inherit the JSDoc instead of copying it.
- **Closed sets of values are enumerations.** Define them once as an `as const`
  object plus a derived union type (`ValidationCode`, `EditorSectionKind`) and
  reference the named member; do not repeat the raw literal in comparisons,
  switches or several files. Derive option lists from `Object.values(...)`, not
  from a duplicated array. A TypeScript `enum` is not the default choice: the
  `as const` object erases at build time and exposes the same contract.
- **Tests** are phrased as observable behaviour, in English. The `describe`/`it`
  callbacks (Vitest) and `test.describe`/`test` callbacks (Playwright) are exempt
  from JSDoc; named helpers inside tests are not.
- **Unit tests mirror `src/`:** `src/lib/export/package.ts` →
  `tests/unit/lib/export/package.test.ts`. Add the test in the same change as
  the code.
- **E2E tests** live in `tests/e2e/` and cover both locales (`/es/` and
  `/en/`). The editor is a hydrated React island; wait for hydration (see
  `waitForEditorHydration` in `builder.spec.ts`) before interacting with it.
- `src/components/ui/**` is excluded from ESLint and coverage. Do not edit those
  files by hand.

## i18n rules

- `astro.config.mjs` sets `prefixDefaultLocale: true`, so every page lives under
  a locale segment.
- `src/pages/index.astro` only redirects `/` to `defaultLocale`; it must not
  render a third copy of the home page.
- Each locale page is a duplicate that imports the shared component and passes
  a typed `texts` object. All markup and logic belong to the shared component,
  never to the locale page.
- `lang` comes from `Astro.currentLocale` (or the layout fallback), not from a
  hardcoded value.
- Links between locales use `getRelativeLocaleUrl` / `getAbsoluteLocaleUrl`.

## Before finishing

1. `pnpm check` is green (if it complains about JSDoc, fix the code, not the
   rules).
2. `pnpm test` is green, including the e2e tests for both locales.
3. New behaviour has a unit test in the mirrored path or an e2e test in
   `tests/e2e/`.
4. No relative imports, no Spanish text in code, no duplicated inherited
   JSDoc.
5. Closed sets of values come from an `as const` object with a derived type,
   not from repeated raw literals.
