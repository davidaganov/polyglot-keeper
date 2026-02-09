import fs from "node:fs/promises"
import path from "node:path"
import { getProvider } from "@/core/registry"
import {
  extractKeys,
  getNestedValue,
  setNestedValue,
  fileExists,
  sleep,
  reorderToMatchSource,
  removeObsoleteKeys
} from "@/utils"
import {
  LOCALE_FORMAT,
  TranslationProvider,
  type JSONObject,
  type TranslationBatch,
  type TranslationStats,
  type SyncConfig
} from "@/interfaces"

const getLocaleFileName = (localeCode: string, format: LOCALE_FORMAT): string => {
  if (format === LOCALE_FORMAT.PAIR) {
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

const translateBatchWithRetry = async (
  provider: TranslationProvider,
  batch: TranslationBatch,
  targetLang: string,
  config: SyncConfig,
  retries: number = config.maxRetries
): Promise<TranslationBatch> => {
  try {
    return await provider.translateBatch(batch, targetLang)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isRateLimit = errorMessage.includes("429")

    if (retries > 0 && isRateLimit) {
      console.log(
        `  ⚠️  Rate limited. Retrying in ${config.retryDelay / 1000}s... (${retries} retries left)`
      )
      await sleep(config.retryDelay)
      return translateBatchWithRetry(provider, batch, targetLang, config, retries - 1)
    }

    throw error
  }
}

const translateMissingKeys = async (
  missingKeys: string[],
  sourceData: JSONObject,
  targetData: JSONObject,
  localeCode: string,
  config: SyncConfig,
  provider: TranslationProvider
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

      const translatedBatch = await translateBatchWithRetry(provider, batch, localeCode, config)

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

const processLocale = async (
  localeCode: string,
  sourceData: JSONObject,
  sourceKeys: string[],
  config: SyncConfig,
  provider: TranslationProvider
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

  const stats = await translateMissingKeys(
    missingKeys,
    sourceData,
    targetData,
    localeCode,
    config,
    provider
  )
  await saveLocaleFile(filePath, targetData, fileName, sourceData)

  return { locale: localeCode, ...stats, removed }
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

  // Initialize provider
  const provider = getProvider(config.provider, config.apiKey, config.model)
  console.log(`🤖 Using provider: ${provider.name} (model: ${config.model})`)

  const results: TranslationStats[] = []
  for (const localeCode of targetLocales) {
    const stats = await processLocale(localeCode, sourceData, sourceKeys, config, provider)
    results.push(stats)
  }

  printSummary(results, startTime)
  return results
}
