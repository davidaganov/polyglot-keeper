import { buildTranslationPrompt, parseApiResponse } from "@/utils"
import { TranslationProvider, TranslationBatch } from "@/interfaces"

export const anthropicDefaultModel = "claude-sonnet-4-5"

export const anthropicModelOptions = [
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5", hint: "Fastest & cheapest" },
  { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", hint: "Best balance" },
  { value: "claude-opus-4-5", label: "Claude Opus 4.5", hint: "Highest quality" }
] as const

export class AnthropicProvider implements TranslationProvider {
  name = "Anthropic"

  constructor(
    private apiKey: string,
    private model: string
  ) {}

  async translateBatch(batch: TranslationBatch, targetLang: string): Promise<TranslationBatch> {
    const prompt = buildTranslationPrompt(batch, targetLang)

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
        system:
          "You are a translation assistant. Output ONLY valid JSON, no markdown, no explanation."
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const text = data.content?.[0]?.text
    return parseApiResponse(text)
  }
}
