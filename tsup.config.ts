import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts", "src/runtime/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  shims: true,
  splitting: false,
  sourcemap: true
})
