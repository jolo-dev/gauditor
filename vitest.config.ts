import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@npm-audit/core": path.resolve(__dirname, "./packages/core/src"),
      "@npm-audit/functions": path.resolve(
        __dirname,
        "./packages/functions/src",
      ),
    },
  },
});
