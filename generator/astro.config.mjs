// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { loadEnv } from "vite";
import { defaultLocale, hreflangCodes, locales } from "@/config/site";

import tailwindcss from "@tailwindcss/vite";

const isDevelopment = process.argv.includes("dev");

const env = loadEnv(
  isDevelopment ? "development" : "production",
  process.cwd(),
  "SITE_URL",
);

// https://astro.build/config
export default defineConfig({
  site: isDevelopment
    ? "http://localhost:4321"
    : env.SITE_URL || "https://example.com",

  i18n: {
    locales,
    defaultLocale,
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },

  output: "static",

  integrations: [
    react(),
    sitemap({
      i18n: {
        defaultLocale,
        locales: hreflangCodes,
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
