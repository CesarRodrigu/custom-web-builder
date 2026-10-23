import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.d.ts", "src/components/ui/**"],
      thresholds: process.env.CI
        ? undefined
        : {
            statements: 90,
            branches: 90,
            functions: 90,
            lines: 90,
          },
    },
  },
});
