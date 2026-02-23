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
  envFile?: string
  json?: JsonConfig
  markdown?: MarkdownConfig
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

export interface MarkdownSyncConfig {
  apiKey: string
  rootDir: string
  contentDir: string
  defaultLocale: string
  locales: string[]
  provider: API_PROVIDER
  model: string
  trackChanges: TRACK_CHANGES
  forceRetranslate: boolean
  batchDelay: number
  retryDelay: number
  maxRetries: number
  exclude?: string[]
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

export interface JsonConfig {
  localeFormat: LOCALE_FORMAT
  locales: string[]
  defaultLocale: string
  localesDir: string
  provider?: API_PROVIDER
  model?: string
  envVarName?: string
  trackChanges?: TRACK_CHANGES
  batchSize?: number
  batchDelay?: number
  retryDelay?: number
  maxRetries?: number
}

export interface MarkdownConfig {
  contentDir: string
  defaultLocale: string
  locales: string[]
  trackChanges?: TRACK_CHANGES
  provider?: API_PROVIDER
  model?: string
  envVarName?: string
  batchSize?: number
  batchDelay?: number
  retryDelay?: number
  maxRetries?: number
  exclude?: string[]
}
