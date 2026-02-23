import { buildTranslationPrompt, parseApiResponse } from "@/utils"
import { TranslationProvider, TranslationBatch } from "@/interfaces"

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
 */
export class GeminiProvider implements TranslationProvider {
  /**
   * Provider name.
   */
  name = "Gemini"

  /**
   * Creates a new instance of the GeminiProvider.
   *
   * @param apiKey - Google Gemini API key.
   * @param model - Gemini model to use for translations.
   */
  constructor(
    private apiKey: string,
    private model: string
  ) {}

  async translateBatch(batch: TranslationBatch, targetLang: string): Promise<TranslationBatch> {
    const prompt = buildTranslationPrompt(batch, targetLang)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    return parseApiResponse(text)
  }
}
