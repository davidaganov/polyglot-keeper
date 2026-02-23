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
import {
  API_PROVIDER,
  TRACK_CHANGES,
  LOCALE_FORMAT,
  type UserConfig,
  type SyncConfig
} from "@/interfaces"

// Register default providers
registerProvider(API_PROVIDER.GEMINI, GeminiProvider)
registerProvider(API_PROVIDER.OPENAI, OpenAIProvider)
registerProvider(API_PROVIDER.ANTHROPIC, AnthropicProvider)

export interface RunOptions {
  rootDir?: string
  setup?: boolean
  force?: boolean
  md?: boolean
}

export const run = async (options: RunOptions = {}): Promise<void> => {
  const rootDir = options.rootDir ?? process.cwd()
  const isMarkdownMode = options.md ?? false

  // Check for config
  const configPath = await findConfigFile(rootDir)
  let userConfig: UserConfig | null = null

  if (options.setup) {
    // Run setup wizard and exit - don't auto-sync after init
    await runSetupWizard(rootDir)
    return
  }

  if (!configPath) {
    console.error("❌ No configuration found. Run `npx polyglot-keeper init` first.")
    process.exit(1)
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
    console.error("❌ No configuration found. Run `npx polyglot-keeper init` first.")
    process.exit(1)
  }

  // Merge with defaults
  const config = mergeWithDefaults(userConfig)

  const modeConfig = isMarkdownMode ? config.markdown : config.json
  const modeName = isMarkdownMode ? "markdown" : "json"

  if (!modeConfig) {
    console.error(
      `❌ Invalid or deprecated config: missing "${modeName}" section in polyglot.config.json. Please run \`npx polyglot-keeper init\` again.`
    )
    process.exit(1)
  }

  if (!modeConfig.provider || !modeConfig.model || !modeConfig.envVarName) {
    console.error(
      `❌ Invalid or deprecated config: "${modeName}" section must include provider, model, and envVarName. Please run \`npx polyglot-keeper init\` again.`
    )
    process.exit(1)
  }

  const modeProvider = modeConfig.provider
  const modeModel = modeConfig.model
  const modeEnvVar = modeConfig.envVarName

  // Load environment variables
  const envPath = path.resolve(rootDir, config.envFile || ".env")
  dotenv.config({ path: envPath })

  // Get API key
  const apiKey = process.env[modeEnvVar]
  if (!apiKey) {
    console.error(
      `❌ Error: ${modeEnvVar} environment variable is not set in ${config.envFile || ".env"}`
    )
    process.exit(1)
  }

  // Prepare sync config
  const jsonConfig = config.json
  const langDir = path.resolve(rootDir, jsonConfig?.localesDir ?? "src/locale")
  const defaultLanguage = jsonConfig?.defaultLocale ?? "EN"

  const getLocaleFileName = (localeCode: string): string => {
    if (jsonConfig?.localeFormat === LOCALE_FORMAT.PAIR) {
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
    apiKey,
    rootDir,
    langDir,
    primaryLocaleFile: path.join(langDir, getLocaleFileName(defaultLanguage)),
    defaultLanguage,
    provider: modeProvider,
    model: modeModel || getDefaultModel(modeProvider),
    localeFormat: jsonConfig?.localeFormat ?? LOCALE_FORMAT.SHORT,
    locales: jsonConfig?.locales ?? ["EN", "RU"],
    defaultLocale: jsonConfig?.defaultLocale ?? "EN",
    localesDir: jsonConfig?.localesDir ?? "src/locale",
    trackChanges: jsonConfig?.trackChanges ?? TRACK_CHANGES.OFF,
    forceRetranslate: options.force ?? false,
    batchSize: modeConfig.batchSize ?? 200,
    batchDelay: modeConfig.batchDelay ?? 2000,
    retryDelay: modeConfig.retryDelay ?? 35000,
    maxRetries: modeConfig.maxRetries ?? 3
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
