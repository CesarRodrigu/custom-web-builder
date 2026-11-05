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
      exclude: [
        "**/*.d.ts",
        "src/components/**",
        "src/features/**",
        "src/hooks/**",
      ],
      thresholds: process.env.CI
        ? undefined
        : {
            statements: 65,
            branches: 65,
            functions: 65,
            lines: 65,
          },
    },
  },
});
