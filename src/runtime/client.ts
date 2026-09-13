import { API_PROVIDER, type TranslationBatch } from "@/interfaces"
import { GeminiProvider, OpenAIProvider, AnthropicProvider } from "@/providers"
import { extractKeys, setNestedValue } from "@/utils"
import { LRUCache, buildCacheKey } from "@/runtime/cache"
import {
  type RuntimeConfig,
  type TranslateOptions,
  type TranslatableInput,
  type ProxyRequestBody
} from "@/runtime/types"

const DEFAULT_LOCALE = "en"
const DEFAULT_CACHE_MAX_SIZE = 200

const isBrowser = typeof window !== "undefined"

const createProvider = (config: RuntimeConfig) => {
  const model = config.model ?? getDefaultModel(config.provider)

  switch (config.provider) {
    case API_PROVIDER.GEMINI:
      return new GeminiProvider(config.apiKey!, model)
    case API_PROVIDER.OPENAI:
      return new OpenAIProvider(config.apiKey!, model)
    case API_PROVIDER.ANTHROPIC:
      return new AnthropicProvider(config.apiKey!, model)
  }
}

const getDefaultModel = (provider: API_PROVIDER): string => {
  switch (provider) {
    case API_PROVIDER.OPENAI:
      return "gpt-4o-mini"
    case API_PROVIDER.ANTHROPIC:
      return "claude-haiku-20240307"
    case API_PROVIDER.GEMINI:
    default:
      return "gemini-flash-latest"
  }
}

/**
 * Converts an arbitrary translatable value into a flat string batch,
 * executes the translation, then restores the original shape.
 */
const flattenAndTranslate = async (
  data: TranslatableInput,
  targetLang: string,
  translator: (batch: TranslationBatch, targetLang: string) => Promise<TranslationBatch>
): Promise<TranslatableInput> => {
  if (typeof data === "string") {
    const result = await translator({ __text: data }, targetLang)
    return result.__text ?? data
  }

  if (Array.isArray(data)) {
    const batch = data.reduce<TranslationBatch>((acc, item, i) => {
      if (typeof item === "string") acc[String(i)] = item
      return acc
    }, {})
    const result = await translator(batch, targetLang)
    return data.map((item, i) => (typeof item === "string" ? (result[String(i)] ?? item) : item))
  }

  // Plain object — flatten to dot-notation, translate, restore
  const flat = extractKeys(data as Record<string, unknown>)
  const batch = flat.reduce<TranslationBatch>((acc, key) => {
    // extractKeys only returns leaf keys; dig using the same util used in sync
    const leaf = getLeafValue(data as Record<string, unknown>, key)
    if (typeof leaf === "string") acc[key] = leaf
    return acc
  }, {})

  const result = await translator(batch, targetLang)
  const output: Record<string, unknown> = structuredClone(data as Record<string, unknown>)
  for (const [key, value] of Object.entries(result)) {
    setNestedValue(output, key, value)
  }
  return output
}

/** Walks a nested object via dot-notation key to its leaf value. */
const getLeafValue = (obj: Record<string, unknown>, dotKey: string): unknown => {
  return dotKey.split(".").reduce<unknown>((current, part) => {
    if (current !== null && typeof current === "object") {
      return (current as Record<string, unknown>)[part]
    }
    return undefined
  }, obj)
}

/**
 * Universal runtime client for polyglot-keeper.
 *
 * Supports two modes:
 * - **Direct Mode**: `apiKey` is provided — calls the AI API directly (server-side / SSR only).
 * - **Proxy Mode**: `endpoint` is provided — POST request to your own backend route which holds the key.
 */
export class PolyglotRuntime {
  private config: RuntimeConfig | null = null
  private cache: LRUCache | null = null

  /**
   * Initialises the runtime with the provided configuration.
   * Must be called before `t()` or `translate()`.
   */
  init(config: RuntimeConfig): void {
    if (!config.apiKey && !config.endpoint) {
      throw new Error(
        "[polyglot-keeper] RuntimeConfig requires either `apiKey` (Direct Mode) or `endpoint` (Proxy Mode)."
      )
    }

    if (config.apiKey && isBrowser) {
      console.warn(
        "[polyglot-keeper] Direct Mode with `apiKey` detected in a browser environment. " +
          "Your API key will be visible in the client bundle. " +
          "Use `endpoint` (Proxy Mode) in production browser apps."
      )
    }

    this.config = config
    this.cache =
      config.cache !== false ? new LRUCache(config.cacheMaxSize ?? DEFAULT_CACHE_MAX_SIZE) : null
  }

  /**
   * Translates a single string.
   *
   * @param text - Source text to translate.
   * @param options - Translation options (target locale, etc.).
   * @returns Translated string.
   */
  async t(text: string, options: TranslateOptions): Promise<string> {
    const result = await this.translate(text, options)
    return result as string
  }

  /**
   * Translates a string, string array, or plain object, preserving its shape and TypeScript type.
   *
   * @param data - Source data to translate.
   * @param options - Translation options.
   * @returns Translated data with the same type as the input.
   */
  async translate<T extends TranslatableInput>(data: T, options: TranslateOptions): Promise<T> {
    const cfg = this.assertInitialised()
    const sourceLang = options.from ?? cfg.defaultLocale ?? DEFAULT_LOCALE
    const targetLang = options.to

    const payloadKey = typeof data === "string" ? data : JSON.stringify(data)
    const model = cfg.model ?? getDefaultModel(cfg.provider)
    const cacheKey = buildCacheKey(cfg.provider, model, sourceLang, targetLang, payloadKey)

    if (!options.bypassCache && this.cache) {
      const cached = this.cache.get(cacheKey)
      if (cached !== undefined) {
        return JSON.parse(cached) as T
      }
    }

    const translator = this.buildTranslator(cfg)
    const result = (await flattenAndTranslate(data, targetLang, translator)) as T

    if (this.cache) {
      this.cache.set(cacheKey, JSON.stringify(result))
    }

    return result
  }

  /** Clears the translation cache. */
  clearCache(): void {
    this.cache?.clear()
  }

  private assertInitialised(): RuntimeConfig {
    if (!this.config) {
      throw new Error(
        "[polyglot-keeper] Runtime is not initialised. Call `polyglot.init(config)` first."
      )
    }
    return this.config
  }

  private buildTranslator(
    cfg: RuntimeConfig
  ): (batch: TranslationBatch, targetLang: string) => Promise<TranslationBatch> {
    if (cfg.endpoint) {
      return this.buildProxyTranslator(cfg)
    }

    const provider = createProvider(cfg)
    return (batch, targetLang) => provider.translateBatch(batch, targetLang)
  }

  private buildProxyTranslator(
    cfg: RuntimeConfig
  ): (batch: TranslationBatch, targetLang: string) => Promise<TranslationBatch> {
    const model = cfg.model ?? getDefaultModel(cfg.provider)

    return async (batch, targetLang) => {
      const body: ProxyRequestBody = {
        batch,
        targetLang,
        provider: cfg.provider,
        model
      }

      const response = await fetch(cfg.endpoint!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(
          `[polyglot-keeper] Proxy endpoint error: ${response.status} ${response.statusText} — ${text}`
        )
      }

      const data = await response.json()

      if (!data || typeof data !== "object" || !("translations" in data)) {
        throw new Error(
          "[polyglot-keeper] Proxy endpoint returned an unexpected response shape. " +
            "Expected `{ translations: Record<string, string> }`."
        )
      }

      return data.translations as TranslationBatch
    }
  }
}
