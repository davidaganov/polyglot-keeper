import { TRANSLATION_PROMPT } from "@/core"
import { type JSONObject, type TranslationBatch } from "@/interfaces"

export { fileExists } from "@/utils/fs"

/**
 * Extracts all keys from a nested JSON object as flat array.
 * @param obj - Object to extract keys from.
 * @param prefix - Key prefix for nested values.
 * @returns Array of dot-notation keys.
 */
export const extractKeys = (obj: JSONObject, prefix = ""): string[] => {
  return Object.entries(obj).reduce<string[]>((acc, [key, val]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (val && typeof val === "object" && !Array.isArray(val)) {
      acc.push(...extractKeys(val as JSONObject, fullKey))
    } else {
      acc.push(fullKey)
    }

    return acc
  }, [])
}

/**
 * Gets a nested value from an object using dot notation.
 * @param obj - Object to search.
 * @param key - Dot-notation key (e.g. "a.b.c").
 * @returns Value at key or undefined.
 */
export const getNestedValue = (obj: JSONObject, key: string): string | undefined => {
  const parts = key.split(".")
  let current: any = obj

  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== "object") {
      return undefined
    }
    current = (current as JSONObject)[part]
  }

  return typeof current === "string" ? current : undefined
}

/**
 * Sets a nested value in an object using dot notation.
 * @param obj - Object to modify.
 * @param key - Dot-notation key.
 * @param value - Value to set.
 */
export const setNestedValue = (obj: JSONObject, key: string, value: string | JSONObject): void => {
  const parts = key.split(".")
  const last = parts.pop()!
  let current = obj

  for (const part of parts) {
    if (!current[part] || typeof current[part] !== "object") {
      current[part] = {}
    }
    current = current[part] as JSONObject
  }

  current[last] = value
}

/**
 * Deletes a nested key from an object.
 * @param obj - Object to modify.
 * @param key - Dot-notation key to delete.
 */
export const deleteNestedKey = (obj: JSONObject, key: string): void => {
  const parts = key.split(".")
  const last = parts.pop()!
  let current = obj

  for (const part of parts) {
    if (!current[part] || typeof current[part] !== "object") {
      return
    }
    current = current[part] as JSONObject
  }

  delete current[last]
  cleanupEmptyObjects(obj)
}

/**
 * Removes empty objects from a nested structure.
 * @param obj - Object to clean.
 */
export const cleanupEmptyObjects = (obj: JSONObject): void => {
  for (const key in obj) {
    const val = obj[key]
    if (val && typeof val === "object" && !Array.isArray(val)) {
      cleanupEmptyObjects(val as JSONObject)
      if (Object.keys(val).length === 0) {
        delete obj[key]
      }
    }
  }
}

/**
 * Pauses execution for specified milliseconds.
 * @param ms - Milliseconds to sleep.
 * @returns Promise that resolves after delay.
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Reorders target object keys to match source structure.
 * @param source - Source object with desired key order.
 * @param target - Target object to reorder.
 * @returns New object with keys in source order.
 */
export const reorderToMatchSource = (source: JSONObject, target: JSONObject): JSONObject => {
  const result: JSONObject = {}

  for (const key in source) {
    if (key in target) {
      const sourceValue = source[key]
      const targetValue = target[key]

      if (
        sourceValue &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        result[key] = reorderToMatchSource(sourceValue as JSONObject, targetValue as JSONObject)
      } else {
        result[key] = targetValue
      }
    }
  }

  return result
}

/**
 * Removes keys from target that don't exist in source.
 * @param targetData - Target object to clean.
 * @param enKeys - Array of valid keys.
 * @returns Number of removed keys.
 */
export const removeObsoleteKeys = (targetData: JSONObject, enKeys: string[]): number => {
  const targetKeys = extractKeys(targetData)
  const enKeysSet = new Set(enKeys)
  let removed = 0

  for (const key of targetKeys) {
    if (!enKeysSet.has(key)) {
      deleteNestedKey(targetData, key)
      removed++
    }
  }

  return removed
}

/**
 * Builds translation prompt for API call.
 * @param batch - Key-value pairs to translate.
 * @param targetLang - Target language code.
 * @returns Formatted prompt string.
 */
export const buildTranslationPrompt = (batch: TranslationBatch, targetLang: string): string => {
  return TRANSLATION_PROMPT.replace("{targetLang}", targetLang).replace(
    "{jsonBatch}",
    JSON.stringify(batch, null, 2)
  )
}

/**
 * Parses API response text into translation batch.
 * @param text - Raw API response text.
 * @returns Parsed key-value translation object.
 */
export const parseApiResponse = (text: string): TranslationBatch => {
  if (!text) {
    throw new Error("Empty response from API")
  }

  const cleanJson = text
    .replace(/```json\n?/, "")
    .replace(/\n?```/, "")
    .trim()

  try {
    return JSON.parse(cleanJson)
  } catch (error) {
    console.error("❌ Failed to parse response as JSON:", text)
    throw error
  }
}

/**
 * Formats API error into a clean, human-readable error string,
 * avoiding giant JSON dumps in console and UI notifications.
 * @param provider - Provider name (Gemini, OpenAI, Anthropic).
 * @param status - HTTP response status.
 * @param rawText - Raw error response body.
 * @returns Human-friendly error description.
 */
export const formatApiError = (provider: string, status: number, rawText: string): string => {
  try {
    const parsed = JSON.parse(rawText)
    const errObj = parsed?.error || parsed
    let message: string =
      typeof errObj?.message === "string"
        ? errObj.message
        : typeof errObj === "string"
          ? errObj
          : ""

    if (Array.isArray(errObj?.details)) {
      const retryInfo = errObj.details.find((d: any) => d?.retryDelay)
      if (retryInfo?.retryDelay) {
        message += ` (Retry after ${retryInfo.retryDelay})`
      }
    }

    if (message) {
      message = message.replace(/\s+/g, " ").trim()
      if (message.length > 220) {
        message = message.slice(0, 217) + "..."
      }
      return `${provider} API error: ${status} - ${message}`
    }
  } catch {
    // rawText is not JSON
  }

  const cleanRaw = rawText.replace(/\s+/g, " ").trim()
  const snippet = cleanRaw.length > 150 ? cleanRaw.slice(0, 147) + "..." : cleanRaw
  return `${provider} API error: ${status} - ${snippet || "Unknown error"}`
}
