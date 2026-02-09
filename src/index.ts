import path from "node:path"
import dotenv from "dotenv"
import { runSetupWizard } from "@/setup"
import { registerProvider, syncTranslations } from "@/core"
import { loadConfig, mergeWithDefaults, findConfigFile } from "@/config-loader"
import {
  GeminiProvider,
  OpenAIProvider,
  AnthropicProvider,
  geminiDefaultModel,
  openaiDefaultModel,
  anthropicDefaultModel
} from "@/providers"
import { API_PROVIDER, type UserConfig, type SyncConfig, LOCALE_FORMAT } from "@/interfaces"

// Register default providers
registerProvider(API_PROVIDER.GEMINI, GeminiProvider)
registerProvider(API_PROVIDER.OPENAI, OpenAIProvider)
registerProvider(API_PROVIDER.ANTHROPIC, AnthropicProvider)

export interface RunOptions {
  rootDir?: string
  setup?: boolean
}

export const run = async (options: RunOptions = {}): Promise<void> => {
  const rootDir = options.rootDir ?? process.cwd()

  // Check for config
  const configPath = await findConfigFile(rootDir)
  let userConfig: UserConfig | null = null

  if (options.setup || !configPath) {
    // Run setup wizard and exit - don't auto-sync after init
    await runSetupWizard(rootDir)
    return
  }

  // Load existing config
  try {
    userConfig = await loadConfig(rootDir)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ Error loading config: ${message}`)
    process.exit(1)
  }

  if (!userConfig) {
    console.error("❌ No configuration found. Run with --setup flag to create one.")
    process.exit(1)
  }

  // Merge with defaults
  const config = mergeWithDefaults(userConfig)

  // Load environment variables
  const envPath = path.resolve(rootDir, config.envFile || ".env")
  dotenv.config({ path: envPath })

  // Get API key
  const apiKey = process.env[config.envVarName || "POLYGLOT_API_KEY"]
  if (!apiKey) {
    console.error(
      `❌ Error: ${config.envVarName || "POLYGLOT_API_KEY"} environment variable is not set in ${config.envFile || ".env"}`
    )
    process.exit(1)
  }

  // Prepare sync config
  const langDir = path.resolve(rootDir, config.localesDir)
  const defaultLanguage = config.defaultLocale

  const getLocaleFileName = (localeCode: string): string => {
    if (config.localeFormat === LOCALE_FORMAT.PAIR) {
      return `${localeCode}-${localeCode.toLowerCase()}.json`
    }
    return `${localeCode.toLowerCase()}.json`
  }

  const getDefaultModel = (provider: API_PROVIDER): string => {
    switch (provider) {
      case API_PROVIDER.OPENAI:
        return openaiDefaultModel
      case API_PROVIDER.ANTHROPIC:
        return anthropicDefaultModel
      case API_PROVIDER.GEMINI:
      default:
        return geminiDefaultModel
    }
  }

  const syncConfig: SyncConfig = {
    ...config,
    apiKey,
    rootDir,
    langDir,
    primaryLocaleFile: path.join(langDir, getLocaleFileName(defaultLanguage)),
    defaultLanguage,
    model: config.model ?? getDefaultModel(config.provider),
    batchSize: config.batchSize ?? 200,
    batchDelay: config.batchDelay ?? 2000,
    retryDelay: config.retryDelay ?? 35000,
    maxRetries: config.maxRetries ?? 3
  }

  // Run sync
  try {
    await syncTranslations(syncConfig)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("🚨 Fatal error:", message)
    process.exit(1)
  }
}
