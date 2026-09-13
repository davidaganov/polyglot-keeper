import { PolyglotRuntime } from "@/runtime/client"

export { PolyglotRuntime } from "@/runtime/client"
export { createTranslateHandler } from "@/runtime/server"
export { API_PROVIDER } from "@/interfaces"
export type {
  RuntimeConfig,
  TranslateOptions,
  TranslatableInput,
  ProxyRequestBody
} from "@/runtime/types"
export type { ServerHandlerConfig } from "@/runtime/server"

/**
 * Global singleton instance.
 *
 * Call `polyglot.init(config)` once (e.g. in your app entry point),
 * then use `polyglot.t()` / `polyglot.translate()` anywhere.
 *
 * @example
 * ```ts
 * import { polyglot } from "polyglot-keeper/runtime"
 *
 * polyglot.init({ provider: "gemini", endpoint: "/api/translate" })
 *
 * const greeting = await polyglot.t("Hello, world!", { to: "ru" })
 * ```
 */
export const polyglot = new PolyglotRuntime()
