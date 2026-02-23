import { API_PROVIDER } from "@/interfaces"
import {
  geminiDefaultModel,
  geminiModelOptions,
  openaiModelOptions,
  anthropicModelOptions
} from "@/providers"
import { selectOne } from "@/setup/ui"

/**
 * Gets available model options for a provider.
 * @param provider - API provider.
 * @returns Array of model options.
 */
export const getModelOptions = (provider: API_PROVIDER) => {
  switch (provider) {
    case API_PROVIDER.GEMINI:
      return geminiModelOptions
    case API_PROVIDER.OPENAI:
      return openaiModelOptions
    case API_PROVIDER.ANTHROPIC:
      return anthropicModelOptions
    default:
      return [{ value: geminiDefaultModel, label: "Default", hint: "" }] as const
  }
}

/**
 * Prompts user to select an AI provider.
 * @returns Selected provider or null if cancelled.
 */
export const askProvider = async (): Promise<API_PROVIDER | null> => {
  return await selectOne<API_PROVIDER>(
    "Choose your translation provider",
    [
      {
        value: API_PROVIDER.GEMINI,
        label: "Google Gemini",
        hint: "Free tier available, generous limits"
      },
      {
        value: API_PROVIDER.OPENAI,
        label: "OpenAI",
        hint: "Fast, high quality translations"
      },
      {
        value: API_PROVIDER.ANTHROPIC,
        label: "Anthropic Claude",
        hint: "Excellent for nuanced translations"
      }
    ] as const,
    0
  )
}

/**
 * Prompts user to select an AI model for the given provider.
 * @param provider - Selected API provider.
 * @returns Selected model or null if cancelled.
 */
export const askModel = async (provider: API_PROVIDER): Promise<string | null> => {
  const modelOptions = getModelOptions(provider)
  return await selectOne<string>("Choose the AI model", modelOptions, 0)
}
