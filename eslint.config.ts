import js from "@eslint/js"
import tseslint from "typescript-eslint"
import configPrettier from "eslint-config-prettier"
import pluginPrettier from "eslint-plugin-prettier"

export default [
  {
    ignores: ["dist/**", "node_modules/**", "bin/**"]
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  configPrettier,

  {
    files: ["**/*.ts", "**/*.js"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        fetch: "readonly",
        setTimeout: "readonly"
      }
    },
    plugins: {
      prettier: pluginPrettier
    },
    rules: {
      // Prettier rules
      "prettier/prettier": ["error", { endOfLine: "auto" }],

      // TypeScript rules
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/unified-signatures": "off",
      "@typescript-eslint/consistent-type-imports": "off"
    }
  }
]
