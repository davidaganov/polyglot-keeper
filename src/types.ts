export enum LocaleFormat {
  SHORT = "short",
  PAIR = "pair"
}

export enum ApiProvider {
  GEMINI = "gemini",
  OPENAI = "openai",
  ANTHROPIC = "anthropic"
}

export type JSONObject = Record<string, unknown>

export type TranslationBatch = Record<string, string>

export interface UserConfig {
  provider: ApiProvider
  localeFormat: LocaleFormat
  locales: string[]
  defaultLocale: string
  localesDir: string
  envFile?: string
  envVarName?: string
  model?: string
  batchSize?: number
  batchDelay?: number
  retryDelay?: number
  maxRetries?: number
}

export interface SyncConfig {
  apiKey: string
  rootDir: string
  langDir: string
  primaryLocaleFile: string
  defaultLanguage: string
  model: string
  provider: ApiProvider
  localeFormat: LocaleFormat
  locales: string[]
  defaultLocale: string
  localesDir: string
  envFile?: string
  envVarName?: string
  batchSize: number
  batchDelay: number
  retryDelay: number
  maxRetries: number
}

export interface TranslationStats {
  locale: string
  missingKeys: number
  translated: number
  failed: number
  removed: number
}
