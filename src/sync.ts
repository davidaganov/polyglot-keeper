import fs from "node:fs/promises"
import path from "node:path"
import {
  type JSONObject,
  type TranslationBatch,
  type TranslationStats,
  type SyncConfig,
  ApiProvider
} from "./types.js"

// ============================================================================
// Utilities
// ============================================================================

const extractKeys = (obj: JSONObject, prefix = ""): string[] => {
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

const getNestedValue = (obj: JSONObject, key: string): string | undefined => {
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

const setNestedValue = (obj: JSONObject, key: string, value: string | JSONObject): void => {
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

const deleteNestedKey = (obj: JSONObject, key: string): void => {
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

const cleanupEmptyObjects = (obj: JSONObject): void => {
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

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const reorderToMatchSource = (source: JSONObject, target: JSONObject): JSONObject => {
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

const removeObsoleteKeys = (targetData: JSONObject, enKeys: string[]): number => {
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

// ============================================================================
// Translation API
// ============================================================================

const buildTranslationPrompt = (batch: TranslationBatch, targetLang: string): string => {
  return `Translate the following JSON object's values into the language with code "${targetLang}".
Preserve the keys exactly.
The values may contain placeholders like "{count}", preserve them as is.
Output ONLY the translated JSON object, no markdown, no explanation.

JSON to translate:
${JSON.stringify(batch, null, 2)}`
}

const parseApiResponse = (text: string): TranslationBatch => {
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

const translateBatchGemini = async (
  batch: TranslationBatch,
  targetLang: string,
  config: SyncConfig
): Promise<TranslationBatch> => {
  const prompt = buildTranslationPrompt(batch, targetLang)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  return parseApiResponse(text)
}

const translateBatchOpenAI = async (
  batch: TranslationBatch,
  targetLang: string,
  config: SyncConfig
): Promise<TranslationBatch> => {
  const prompt = buildTranslationPrompt(batch, targetLang)

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content:
            "You are a translation assistant. Output ONLY valid JSON, no markdown, no explanation."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.1
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content
  return parseApiResponse(text)
}

const translateBatchAnthropic = async (
  batch: TranslationBatch,
  targetLang: string,
  config: SyncConfig
): Promise<TranslationBatch> => {
  const prompt = buildTranslationPrompt(batch, targetLang)

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      system:
        "You are a translation assistant. Output ONLY valid JSON, no markdown, no explanation."
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text
  return parseApiResponse(text)
}

const translateBatchWithRetry = async (
  batch: TranslationBatch,
  targetLang: string,
  config: SyncConfig,
  retries: number = config.maxRetries
): Promise<TranslationBatch> => {
  try {
    switch (config.provider) {
      case ApiProvider.OPENAI:
        return await translateBatchOpenAI(batch, targetLang, config)
      case ApiProvider.ANTHROPIC:
        return await translateBatchAnthropic(batch, targetLang, config)
      case ApiProvider.GEMINI:
      default:
        return await translateBatchGemini(batch, targetLang, config)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isRateLimit = errorMessage.includes("429")

    if (retries > 0 && isRateLimit) {
      console.log(
        `  ⚠️  Rate limited. Retrying in ${config.retryDelay / 1000}s... (${retries} retries left)`
      )
      await sleep(config.retryDelay)
      return translateBatchWithRetry(batch, targetLang, config, retries - 1)
    }

    throw error
  }
}

// ============================================================================
// Locale Processing
// ============================================================================

const getLocaleFileName = (localeCode: string, format: string): string => {
  if (format === "pair") {
    return `${localeCode}-${localeCode.toLowerCase()}.json`
  }
  return `${localeCode.toLowerCase()}.json`
}

const loadOrCreateLocaleFile = async (
  filePath: string,
  localeCode: string
): Promise<JSONObject> => {
  if (await fileExists(filePath)) {
    const content = await fs.readFile(filePath, "utf-8")
    return JSON.parse(content)
  }

  console.log(`📝 Creating new locale file for ${localeCode}`)
  return {}
}

const saveLocaleFile = async (
  filePath: string,
  data: JSONObject,
  fileName: string,
  sourceData: JSONObject
): Promise<void> => {
  const reorderedData = reorderToMatchSource(sourceData, data)
  await fs.writeFile(filePath, JSON.stringify(reorderedData, null, 2) + "\n", "utf-8")
  console.log(`💾 Saved ${fileName}`)
}

const processLocale = async (
  localeCode: string,
  sourceData: JSONObject,
  sourceKeys: string[],
  config: SyncConfig
): Promise<TranslationStats> => {
  const fileName = getLocaleFileName(localeCode, config.localeFormat)
  const filePath = path.join(config.langDir, fileName)

  console.log(`\n━━━ Processing ${localeCode} (${fileName}) ━━━`)

  const targetData = await loadOrCreateLocaleFile(filePath, localeCode)

  // Remove obsolete keys
  const removed = removeObsoleteKeys(targetData, sourceKeys)
  if (removed > 0) {
    console.log(`🗑️  Removed ${removed} obsolete keys`)
  }

  // Find missing keys
  const missingKeys = sourceKeys.filter((key) => getNestedValue(targetData, key) === undefined)

  if (missingKeys.length === 0 && removed === 0) {
    console.log(`✅ ${localeCode} is up to date (${sourceKeys.length} keys)`)
    await saveLocaleFile(filePath, targetData, fileName, sourceData)
    return {
      locale: localeCode,
      missingKeys: 0,
      translated: 0,
      failed: 0,
      removed
    }
  }

  if (missingKeys.length > 0) {
    console.log(`📦 Found ${missingKeys.length} missing keys out of ${sourceKeys.length} total`)
  }

  const stats = await translateMissingKeys(missingKeys, sourceData, targetData, localeCode, config)
  await saveLocaleFile(filePath, targetData, fileName, sourceData)

  return { locale: localeCode, ...stats, removed }
}

const translateMissingKeys = async (
  missingKeys: string[],
  sourceData: JSONObject,
  targetData: JSONObject,
  localeCode: string,
  config: SyncConfig
): Promise<{ missingKeys: number; translated: number; failed: number }> => {
  let translated = 0
  let failed = 0
  const totalBatches = Math.ceil(missingKeys.length / config.batchSize)

  for (let i = 0; i < missingKeys.length; i += config.batchSize) {
    const batchNumber = Math.floor(i / config.batchSize) + 1
    const batchKeys = missingKeys.slice(i, i + config.batchSize)

    console.log(`  📤 Batch ${batchNumber}/${totalBatches} (${batchKeys.length} keys)`)

    try {
      const batch = batchKeys.reduce<TranslationBatch>((acc, key) => {
        const value = getNestedValue(sourceData, key)
        if (value) acc[key] = value
        return acc
      }, {})

      const translatedBatch = await translateBatchWithRetry(batch, localeCode, config)

      for (const [key, value] of Object.entries(translatedBatch)) {
        setNestedValue(targetData, key, value)
        translated++
      }

      console.log(`  ✅ Translated ${Object.keys(translatedBatch).length} keys`)

      if (i + config.batchSize < missingKeys.length) {
        console.log(`  ⏳ Waiting ${config.batchDelay / 1000}s before next batch...`)
        await sleep(config.batchDelay)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`  ❌ Batch ${batchNumber} failed: ${errorMessage}`)
      failed += batchKeys.length
    }
  }

  return { missingKeys: missingKeys.length, translated, failed }
}

// ============================================================================
// Main Sync
// ============================================================================

export const syncTranslations = async (config: SyncConfig): Promise<TranslationStats[]> => {
  console.log("🌍 Translation Synchronization Tool")
  console.log("━".repeat(50))
  const startTime = Date.now()

  // Ensure locales directory exists
  await fs.mkdir(config.langDir, { recursive: true })

  if (!(await fileExists(config.primaryLocaleFile))) {
    throw new Error(`Primary locale file not found at ${config.primaryLocaleFile}`)
  }

  const sourceData = JSON.parse(await fs.readFile(config.primaryLocaleFile, "utf-8"))
  const sourceKeys = extractKeys(sourceData)
  console.log(`📂 Loaded primary locale (${config.defaultLanguage}) with ${sourceKeys.length} keys`)

  const targetLocales = config.locales.filter((locale) => locale !== config.defaultLanguage)
  console.log(`🎯 Target locales: ${targetLocales.join(", ")}`)

  const results: TranslationStats[] = []
  for (const localeCode of targetLocales) {
    const stats = await processLocale(localeCode, sourceData, sourceKeys, config)
    results.push(stats)
  }

  printSummary(results, startTime)
  return results
}

const printSummary = (results: TranslationStats[], startTime: number): void => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  const totalTranslated = results.reduce((sum, r) => sum + r.translated, 0)
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)
  const totalRemoved = results.reduce((sum, r) => sum + r.removed, 0)

  console.log("\n" + "━".repeat(50))
  console.log("📊 Summary:")
  results.forEach((stat) => {
    const parts: string[] = []
    if (stat.translated > 0) parts.push(`${stat.translated} translated`)
    if (stat.failed > 0) parts.push(`${stat.failed} failed`)
    if (stat.removed > 0) parts.push(`${stat.removed} removed`)

    if (parts.length > 0) {
      console.log(`  ${stat.locale}: ${parts.join(", ")}`)
    }
  })
  console.log(`\n✨ Completed in ${duration}s`)

  const summary: string[] = []
  if (totalTranslated > 0) summary.push(`${totalTranslated} translations`)
  if (totalFailed > 0) summary.push(`${totalFailed} failures`)
  if (totalRemoved > 0) summary.push(`${totalRemoved} removed`)

  if (summary.length > 0) {
    console.log(`   Total: ${summary.join(", ")}`)
  } else {
    console.log(`   All locales are synchronized and sorted`)
  }
}
