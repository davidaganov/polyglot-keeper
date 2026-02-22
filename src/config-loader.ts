import fs from "node:fs/promises"
import path from "node:path"
import { API_PROVIDER, LOCALE_FORMAT, TRACK_CHANGES, type UserConfig } from "@/interfaces"
import { fileExists } from "@/utils"

const DEFAULT_CONFIG: UserConfig = {
  provider: API_PROVIDER.GEMINI,
  localeFormat: LOCALE_FORMAT.SHORT,
  locales: ["EN", "RU"],
  defaultLocale: "EN",
  localesDir: "src/locale",
  trackChanges: TRACK_CHANGES.OFF,
  envFile: ".env",
  envVarName: "POLYGLOT_API_KEY",
  batchSize: 200,
  batchDelay: 2000,
  retryDelay: 35000,
  maxRetries: 3
}

export const findConfigFile = async (rootDir: string): Promise<string | null> => {
  const possibleFiles = ["polyglot.config.json"]

  for (const file of possibleFiles) {
    const fullPath = path.join(rootDir, file)
    if (await fileExists(fullPath)) {
      return fullPath
    }
  }

  return null
}

export const loadConfig = async (rootDir: string): Promise<UserConfig | null> => {
  const configPath = await findConfigFile(rootDir)

  if (!configPath) return null

  try {
    const content = await fs.readFile(configPath, "utf-8")
    return JSON.parse(content)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to load config from ${configPath}: ${message}`)
  }
}

export const mergeWithDefaults = (config: Partial<UserConfig>): UserConfig => {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    locales: config.locales ?? DEFAULT_CONFIG.locales,
    provider: config.provider ?? DEFAULT_CONFIG.provider,
    localeFormat: config.localeFormat ?? DEFAULT_CONFIG.localeFormat
  }
}

export { DEFAULT_CONFIG }
