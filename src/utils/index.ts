import fs from "node:fs/promises"
import { TRANSLATION_PROMPT } from "@/core"
import { type JSONObject, type TranslationBatch } from "@/interfaces"

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

export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

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

export const buildTranslationPrompt = (batch: TranslationBatch, targetLang: string): string => {
  return TRANSLATION_PROMPT.replace("{targetLang}", targetLang).replace(
    "{jsonBatch}",
    JSON.stringify(batch, null, 2)
  )
}

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
