import { buildTranslationPrompt, parseApiResponse } from "@/utils"
import { TranslationProvider, TranslationBatch } from "@/interfaces"

/** Default OpenAI model. */
export const openaiDefaultModel = "gpt-4o-mini"

/**
 * Available OpenAI model options for setup wizard.
 */
export const openaiModelOptions = [
  { value: "gpt-4o-mini", label: "GPT-4o mini", hint: "Fast & affordable" },
  { value: "gpt-4o", label: "GPT-4o", hint: "Balanced quality" },
  { value: "gpt-4.1", label: "GPT-4.1", hint: "Higher quality" }
] as const

/**
 * OpenAI translation provider implementation.
 * Uses OpenAI API for batch translations.
 */
export class OpenAIProvider implements TranslationProvider {
  /**
   * Provider name.
   */
  name = "OpenAI"

  /**
   * Creates a new instance of OpenAIProvider.
   * @param apiKey OpenAI API key.
   * @param model OpenAI model to use for translations.
   */
  constructor(
    private apiKey: string,
    private model: string
  ) {}

  async translateBatch(batch: TranslationBatch, targetLang: string): Promise<TranslationBatch> {
    const prompt = buildTranslationPrompt(batch, targetLang)

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "You are a translation assistant. Output ONLY valid JSON, no markdown, no explanation."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.1
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    return parseApiResponse(text)
  }
}
