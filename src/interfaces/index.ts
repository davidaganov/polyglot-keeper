export enum LOCALE_FORMAT {
  SHORT = "short",
  PAIR = "pair"
}

export enum API_PROVIDER {
  GEMINI = "gemini",
  OPENAI = "openai",
  ANTHROPIC = "anthropic"
}

export enum TRACK_CHANGES {
  OFF = "off",
  ON = "on",
  CAREFULLY = "carefully"
}

export type JSONObject = Record<string, unknown>

export type TranslationBatch = Record<string, string>

export interface UserConfig {
  provider: API_PROVIDER
  localeFormat: LOCALE_FORMAT
  locales: string[]
  defaultLocale: string
  localesDir: string
  trackChanges?: TRACK_CHANGES
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
  provider: API_PROVIDER
  localeFormat: LOCALE_FORMAT
  locales: string[]
  defaultLocale: string
  localesDir: string
  trackChanges: TRACK_CHANGES
  forceRetranslate: boolean
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
  updated: number
}

export interface TranslationProvider {
  name: string
  translateBatch(batch: TranslationBatch, targetLang: string): Promise<TranslationBatch>
}
