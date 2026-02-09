import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "project-test/",
        "**/*.d.ts",
        "**/*.test.ts",
        "tsup.config.ts",
        "vitest.config.ts"
      ]
    },
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
})
