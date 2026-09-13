import { API_PROVIDER } from "@/interfaces"

/** Input types that the runtime can translate. */
export type TranslatableInput = string | string[] | Record<string, unknown>

/**
 * Configuration for the PolyglotRuntime.
 *
 * Provide either `apiKey` (Direct Mode — server-side / SSR) or `endpoint`
 * (Proxy Mode — browser clients). Both can coexist; if `endpoint` is set it
 * takes precedence in browser environments.
 */
export interface RuntimeConfig {
  provider: API_PROVIDER
  model?: string
  /** Direct Mode: AI provider API key. Keep out of browser bundles. */
  apiKey?: string
  /** Proxy Mode: URL of your own server endpoint that forwards to the AI API. */
  endpoint?: string
  /** Default source locale (used when `from` is not provided). Default: "en". */
  defaultLocale?: string
  /** Enable the in-memory translation cache. Default: true. */
  cache?: boolean
  /** Maximum number of entries in the LRU cache. Default: 200. */
  cacheMaxSize?: number
}

/** Per-call options for `translate()` / `t()`. */
export interface TranslateOptions {
  /** BCP-47 locale code of the target language (e.g. "ru", "de", "zh-CN"). */
  to: string
  /** BCP-47 locale code of the source language. Defaults to `RuntimeConfig.defaultLocale`. */
  from?: string
  /** Skip the cache and always call the AI provider. */
  bypassCache?: boolean
}

/**
 * The body shape sent by the runtime client to a Proxy Mode endpoint,
 * and expected by `createTranslateHandler` on the server.
 */
export interface ProxyRequestBody {
  batch: Record<string, string>
  targetLang: string
  provider: API_PROVIDER
  model: string
}
