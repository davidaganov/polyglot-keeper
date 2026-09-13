import { API_PROVIDER, type TranslationBatch } from "@/interfaces"
import { GeminiProvider, OpenAIProvider, AnthropicProvider } from "@/providers"
import { type ProxyRequestBody } from "@/runtime/types"

/**
 * Configuration for the server-side proxy handler.
 * Keep the API keys in environment variables, never in client code.
 */
export interface ServerHandlerConfig {
  /** Map of provider → API key (supports single key or array / comma-separated keys). */
  keys: Partial<Record<API_PROVIDER, string | string[]>>
  /**
   * Optional allowlist of target languages.
   * If set, requests to languages not in this list will be rejected with 400.
   */
  allowedLocales?: string[]
}

const instantiateProvider = (provider: API_PROVIDER, model: string, apiKey: string | string[]) => {
  switch (provider) {
    case API_PROVIDER.GEMINI:
      return new GeminiProvider(apiKey, model)
    case API_PROVIDER.OPENAI:
      return new OpenAIProvider(apiKey, model)
    case API_PROVIDER.ANTHROPIC:
      return new AnthropicProvider(apiKey, model)
  }
}

/**
 * Creates a Fetch API-compatible request handler for Proxy Mode.
 *
 * Works out of the box with:
 * - Astro API routes (`export const POST = createTranslateHandler({...})`)
 * - SvelteKit server routes
 * - Cloudflare Workers / Hono
 * - Next.js App Router route handlers
 * - Nuxt server routes (wrap in `defineEventHandler` with `toWebRequest`)
 *
 * @example
 * ```ts
 * // src/pages/api/translate.ts (Astro)
 * import { createTranslateHandler } from "polyglot-keeper/runtime"
 *
 * export const POST = createTranslateHandler({
 *   keys: { gemini: import.meta.env.GEMINI_API_KEY }
 * })
 * ```
 *
 * The handler expects POST requests with a JSON body of:
 * `{ batch: Record<string, string>, targetLang: string, provider: string, model: string }`
 *
 * It responds with:
 * `{ translations: Record<string, string> }`
 */
export const createTranslateHandler = (
  config: ServerHandlerConfig
): ((request: Request) => Promise<Response>) => {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      })
    }

    let body: ProxyRequestBody
    try {
      body = (await request.json()) as ProxyRequestBody
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    const { batch, targetLang, provider, model } = body

    if (!batch || typeof batch !== "object" || !targetLang || !provider || !model) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: batch, targetLang, provider, model" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    if (
      config.allowedLocales &&
      !config.allowedLocales.map((l) => l.toLowerCase()).includes(targetLang.toLowerCase())
    ) {
      return new Response(
        JSON.stringify({ error: `Locale "${targetLang}" is not in the allowed list` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const apiKey = config.keys[provider as API_PROVIDER]
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: `No API key configured for provider "${provider}"` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    try {
      const providerInstance = instantiateProvider(provider as API_PROVIDER, model, apiKey)
      const translations: TranslationBatch = await providerInstance.translateBatch(
        batch,
        targetLang
      )
      return new Response(JSON.stringify({ translations }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return new Response(JSON.stringify({ error: `Translation failed: ${message}` }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      })
    }
  }
}
