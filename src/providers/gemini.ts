import { buildTranslationPrompt, parseApiResponse, formatApiError } from "@/utils"
import { TranslationProvider, TranslationBatch } from "@/interfaces"
import { KeyRotator } from "@/core/rotator"

/** Default Gemini model. */
export const geminiDefaultModel = "gemini-flash-latest"

/** Available Gemini model options for setup wizard. */
export const geminiModelOptions = [
  {
    value: "gemini-flash-latest",
    label: "Gemini Flash (Latest)",
    hint: "Always up-to-date, best price-performance"
  },
  {
    value: "gemini-pro-latest",
    label: "Gemini Pro (Latest)",
    hint: "Highest quality for complex translations"
  },
  {
    value: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite",
    hint: "Cheapest for high volume"
  }
] as const

/**
 * Gemini translation provider implementation.
 * Uses Google Gemini API for batch translations.
 * Supports multiple API keys with automatic failover on rate limits (429) and high load (503).
 */
export class GeminiProvider implements TranslationProvider {
  /**
   * Provider name.
   */
  name = "Gemini"

  private rotator: KeyRotator

  /**
   * Creates a new instance of the GeminiProvider.
   *
   * @param apiKey - Google Gemini API key or multiple keys.
   * @param model - Gemini model to use for translations.
   */
  constructor(
    apiKey: string | string[],
    private model: string
  ) {
    this.rotator = new KeyRotator(apiKey)
  }

  /**
   * Total number of configured API keys.
   */
  get keyCount(): number {
    return this.rotator.count
  }

  /**
   * Returns the currently active API key.
   */
  get apiKey(): string {
    return this.rotator.getKey()
  }

  async translateBatch(batch: TranslationBatch, targetLang: string): Promise<TranslationBatch> {
    const prompt = buildTranslationPrompt(batch, targetLang)

    return this.rotator.executeWithRetry(async (key) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${key}`

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(formatApiError("Gemini", response.status, errorText))
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      return parseApiResponse(text)
    })
  }
}
