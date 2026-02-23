import fs from "node:fs/promises"
import path from "node:path"
import { LOCALE_FORMAT, TRACK_CHANGES, type UserConfig, type JsonConfig } from "@/interfaces"
import { fileExists } from "@/utils"

const DEFAULT_JSON_CONFIG: JsonConfig = {
  localeFormat: LOCALE_FORMAT.SHORT,
  locales: ["EN", "RU"],
  defaultLocale: "EN",
  localesDir: "src/locale",
  trackChanges: TRACK_CHANGES.OFF,
  batchSize: 200,
  batchDelay: 2000,
  retryDelay: 35000,
  maxRetries: 3
}

/**
 * Finds the config file in the given directory.
 * @param rootDir - Project root directory.
 * @returns Path to config file or null if not found.
 */
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

/**
 * Loads and parses the config file.
 * @param rootDir - Project root directory.
 * @returns Parsed config or null if not found.
 */
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

/**
 * Merges partial config with default values.
 * @param config - Partial user configuration.
 * @returns Complete configuration with defaults.
 */
export const mergeWithDefaults = (config: Partial<UserConfig>): UserConfig => {
  const merged: UserConfig = {
    envFile: config.envFile ?? ".env"
  }

  if (config.json) {
    merged.json = {
      ...DEFAULT_JSON_CONFIG,
      ...config.json,
      locales: config.json.locales ?? DEFAULT_JSON_CONFIG.locales,
      localeFormat: config.json.localeFormat ?? DEFAULT_JSON_CONFIG.localeFormat
    }
  }

  if (config.markdown) {
    merged.markdown = config.markdown
  }

  return merged
}

export { DEFAULT_JSON_CONFIG }
