import path from "node:path"
import dotenv from "dotenv"
import { runSetupWizard } from "@/setup"
import { registerProvider, syncTranslations, syncMarkdownTranslations } from "@/core"
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
  type SyncConfig,
  type JsonConfig,
  type MarkdownConfig,
  type MarkdownSyncConfig
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

const getLocaleFileName = (localeCode: string, format: LOCALE_FORMAT): string => {
  if (format === LOCALE_FORMAT.PAIR) {
    return `${localeCode}-${localeCode.toLowerCase()}.json`
  }
  return `${localeCode.toLowerCase()}.json`
}

const buildJsonSyncConfig = (
  rootDir: string,
  apiKey: string,
  jsonConfig: JsonConfig,
  forceRetranslate: boolean
): SyncConfig => {
  const langDir = path.resolve(rootDir, jsonConfig.localesDir)
  const defaultLanguage = jsonConfig.defaultLocale

  return {
    apiKey,
    rootDir,
    langDir,
    primaryLocaleFile: path.join(
      langDir,
      getLocaleFileName(defaultLanguage, jsonConfig.localeFormat)
    ),
    defaultLanguage,
    provider: jsonConfig.provider!,
    model: jsonConfig.model || getDefaultModel(jsonConfig.provider!),
    localeFormat: jsonConfig.localeFormat,
    locales: jsonConfig.locales,
    defaultLocale: jsonConfig.defaultLocale,
    localesDir: jsonConfig.localesDir,
    trackChanges: jsonConfig.trackChanges ?? TRACK_CHANGES.OFF,
    forceRetranslate,
    batchSize: jsonConfig.batchSize ?? 200,
    batchDelay: jsonConfig.batchDelay ?? 2000,
    retryDelay: jsonConfig.retryDelay ?? 35000,
    maxRetries: jsonConfig.maxRetries ?? 3
  }
}

const buildMarkdownSyncConfig = (
  rootDir: string,
  apiKey: string,
  markdownConfig: MarkdownConfig,
  forceRetranslate: boolean
): MarkdownSyncConfig => {
  return {
    apiKey,
    rootDir,
    contentDir: markdownConfig.contentDir,
    defaultLocale: markdownConfig.defaultLocale,
    locales: markdownConfig.locales,
    provider: markdownConfig.provider!,
    model: markdownConfig.model || getDefaultModel(markdownConfig.provider!),
    trackChanges: markdownConfig.trackChanges ?? TRACK_CHANGES.OFF,
    forceRetranslate,
    batchDelay: markdownConfig.batchDelay ?? 2000,
    retryDelay: markdownConfig.retryDelay ?? 35000,
    maxRetries: markdownConfig.maxRetries ?? 3,
    exclude: markdownConfig.exclude
  }
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

  // Run sync
  try {
    if (isMarkdownMode) {
      await syncMarkdownTranslations(
        buildMarkdownSyncConfig(
          rootDir,
          apiKey,
          modeConfig as MarkdownConfig,
          options.force ?? false
        )
      )
      return
    }

    await syncTranslations(
      buildJsonSyncConfig(rootDir, apiKey, modeConfig as JsonConfig, options.force ?? false)
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("🚨 Fatal error:", message)
    process.exit(1)
  }
}
