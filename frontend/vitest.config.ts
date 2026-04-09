import path from "node:path";
import { defineConfig } from "vitest/config";

// Vitest configuration for unit / component tests.
//
// E2E (browser-level) tests live in `e2e/` and run via Playwright; see
// playwright.config.ts. Unit tests live next to the source they test
// as `*.test.ts` or `*.test.tsx`.
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "node_modules/**",
      ".next/**",
      "e2e/**", // Playwright tests
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
