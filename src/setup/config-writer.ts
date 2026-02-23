import { TRACK_CHANGES, type UserConfig } from "@/interfaces"

/**
 * Generates JSON config file content.
 * @param config - User configuration object.
 * @returns JSON string representation.
 */
export const generateConfigFile = (config: UserConfig): string => {
  const configObj: Record<string, unknown> = {
    envFile: config.envFile || ".env"
  }

  if (config.json) {
    const jsonSection: Record<string, unknown> = {
      provider: config.json.provider,
      model: config.json.model,
      envVarName: config.json.envVarName,
      localeFormat: config.json.localeFormat,
      locales: config.json.locales,
      defaultLocale: config.json.defaultLocale,
      localesDir: config.json.localesDir
    }

    if (config.json.trackChanges && config.json.trackChanges !== TRACK_CHANGES.OFF) {
      jsonSection.trackChanges = config.json.trackChanges
    }

    if (typeof config.json.batchSize === "number") jsonSection.batchSize = config.json.batchSize
    if (typeof config.json.batchDelay === "number") jsonSection.batchDelay = config.json.batchDelay
    if (typeof config.json.retryDelay === "number") jsonSection.retryDelay = config.json.retryDelay
    if (typeof config.json.maxRetries === "number") jsonSection.maxRetries = config.json.maxRetries

    configObj.json = jsonSection
  }

  if (config.markdown) {
    const mdSection: Record<string, unknown> = {
      contentDir: config.markdown.contentDir,
      defaultLocale: config.markdown.defaultLocale,
      locales: config.markdown.locales
    }

    if (config.markdown.trackChanges && config.markdown.trackChanges !== TRACK_CHANGES.OFF) {
      mdSection.trackChanges = config.markdown.trackChanges
    }

    if (config.markdown.provider) mdSection.provider = config.markdown.provider
    if (config.markdown.model) mdSection.model = config.markdown.model
    if (config.markdown.envVarName) mdSection.envVarName = config.markdown.envVarName

    if (typeof config.markdown.batchSize === "number") {
      mdSection.batchSize = config.markdown.batchSize
    }
    if (typeof config.markdown.batchDelay === "number") {
      mdSection.batchDelay = config.markdown.batchDelay
    }
    if (typeof config.markdown.retryDelay === "number") {
      mdSection.retryDelay = config.markdown.retryDelay
    }
    if (typeof config.markdown.maxRetries === "number") {
      mdSection.maxRetries = config.markdown.maxRetries
    }

    configObj.markdown = mdSection
  }

  return JSON.stringify(configObj, null, 2) + "\n"
}
