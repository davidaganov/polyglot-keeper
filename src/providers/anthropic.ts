import { buildTranslationPrompt, parseApiResponse, formatApiError } from "@/utils"
import { TranslationProvider, TranslationBatch } from "@/interfaces"
import { KeyRotator } from "@/core/rotator"

/** Default Anthropic model. */
export const anthropicDefaultModel = "claude-sonnet-4-5"

/**
 * Available Anthropic model options for setup wizard.
 */
export const anthropicModelOptions = [
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5", hint: "Fastest & cheapest" },
  { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", hint: "Best balance" },
  { value: "claude-opus-4-5", label: "Claude Opus 4.5", hint: "Highest quality" }
] as const

/**
 * Anthropic translation provider implementation.
 * Uses Claude API for batch translations.
 * Supports multiple API keys with automatic failover on rate limits (429) and high load (503).
 */
export class AnthropicProvider implements TranslationProvider {
  /**
   * Provider name.
   */
  name = "Anthropic"

  private rotator: KeyRotator

  /**
   * Creates a new AnthropicProvider instance.
   *
   * @param apiKey - Anthropic API key or multiple keys.
   * @param model - Anthropic model to use for translations.
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
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
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
        throw new Error(formatApiError("Anthropic", response.status, errorText))
      }

      const data = await response.json()
      const text = data.content?.[0]?.text
      return parseApiResponse(text)
    })
  }
}
