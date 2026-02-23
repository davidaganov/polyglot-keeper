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
  TRACK_CHANGES,
  TranslationProvider,
  type JSONObject,
  type TranslationBatch,
  type TranslationStats,
  type SyncConfig
} from "@/interfaces"

interface LockSectionData {
  __frozen: string[]
  values: Record<string, string>
}

interface LockFileData {
  json?: LockSectionData
  md?: LockSectionData
  [key: string]: unknown
}

const LOCK_FILE_NAME = ".polyglot-lock.json"

const loadLockFile = async (
  lockFilePath: string
): Promise<{ values: Record<string, string>; frozen: string[] }> => {
  if (await fileExists(lockFilePath)) {
    const content = await fs.readFile(lockFilePath, "utf-8")
    const raw = JSON.parse(content) as LockFileData
    const section = raw.json as Partial<LockSectionData> | undefined
    return {
      values: section?.values ?? {},
      frozen: Array.isArray(section?.__frozen) ? section.__frozen : []
    }
  }

  return { values: {}, frozen: [] }
}

const saveLockFile = async (
  lockFilePath: string,
  sourceData: JSONObject,
  sourceKeys: string[],
  frozen: string[],
  skippedKeys: string[],
  previousValues: Record<string, string>
): Promise<void> => {
  let existingRaw: LockFileData = {}
  if (await fileExists(lockFilePath)) {
    try {
      existingRaw = JSON.parse(await fs.readFile(lockFilePath, "utf-8")) as LockFileData
    } catch {
      existingRaw = {}
    }
  }

  const jsonValues: Record<string, string> = {}
  const skippedSet = new Set(skippedKeys)

  for (const key of sourceKeys) {
    if (skippedSet.has(key) && previousValues[key] !== undefined) {
      jsonValues[key] = previousValues[key]
    } else {
      const value = getNestedValue(sourceData, key)
      if (value !== undefined) {
        jsonValues[key] = value
      }
    }
  }

  const lockData: LockFileData = {
    ...existingRaw,
    json: {
      __frozen: frozen,
      values: jsonValues
    }
  }

  await fs.writeFile(lockFilePath, JSON.stringify(lockData, null, 2) + "\n", "utf-8")
}

const findChangedKeys = (
  sourceData: JSONObject,
  sourceKeys: string[],
  lockValues: Record<string, string>,
  frozenKeys: string[]
): string[] => {
  const frozenSet = new Set(frozenKeys)
  const changedKeys: string[] = []

  for (const key of sourceKeys) {
    if (frozenSet.has(key)) continue

    const currentValue = getNestedValue(sourceData, key)
    const lockedValue = lockValues[key]

    // Key exists in lock but value has changed
    if (lockedValue !== undefined && currentValue !== lockedValue) {
      changedKeys.push(key)
    }
  }

  return changedKeys
}

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

const translateKeys = async (
  keysToTranslate: string[],
  sourceData: JSONObject,
  targetData: JSONObject,
  localeCode: string,
  config: SyncConfig,
  provider: TranslationProvider
): Promise<{ translated: number; failed: number }> => {
  let translated = 0
  let failed = 0
  const totalBatches = Math.ceil(keysToTranslate.length / config.batchSize)

  for (let i = 0; i < keysToTranslate.length; i += config.batchSize) {
    const batchNumber = Math.floor(i / config.batchSize) + 1
    const batchKeys = keysToTranslate.slice(i, i + config.batchSize)

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

      if (i + config.batchSize < keysToTranslate.length) {
        console.log(`  ⏳ Waiting ${config.batchDelay / 1000}s before next batch...`)
        await sleep(config.batchDelay)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`  ❌ Batch ${batchNumber} failed: ${errorMessage}`)
      failed += batchKeys.length
    }
  }

  return { translated, failed }
}

const processLocale = async (
  localeCode: string,
  sourceData: JSONObject,
  sourceKeys: string[],
  changedKeys: string[],
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

  // Determine keys to retranslate (changed or force)
  let keysToUpdate: string[] = []
  if (config.forceRetranslate) {
    // Force mode: retranslate all existing keys
    keysToUpdate = sourceKeys.filter((key) => getNestedValue(targetData, key) !== undefined)
    if (keysToUpdate.length > 0) {
      console.log(`🔄 Force mode: retranslating all ${keysToUpdate.length} existing keys`)
    }
  } else if (changedKeys.length > 0) {
    // Track changes mode: retranslate only changed keys that exist in target
    keysToUpdate = changedKeys.filter((key) => getNestedValue(targetData, key) !== undefined)
    if (keysToUpdate.length > 0) {
      console.log(`🔄 Found ${keysToUpdate.length} changed keys to retranslate`)
    }
  }

  const allKeysToTranslate = [...missingKeys, ...keysToUpdate]

  if (allKeysToTranslate.length === 0 && removed === 0) {
    console.log(`✅ ${localeCode} is up to date (${sourceKeys.length} keys)`)
    await saveLocaleFile(filePath, targetData, fileName, sourceData)
    return {
      locale: localeCode,
      missingKeys: 0,
      translated: 0,
      updated: 0,
      failed: 0,
      removed
    }
  }

  if (missingKeys.length > 0) {
    console.log(`📦 Found ${missingKeys.length} missing keys out of ${sourceKeys.length} total`)
  }

  const stats = await translateKeys(
    allKeysToTranslate,
    sourceData,
    targetData,
    localeCode,
    config,
    provider
  )
  await saveLocaleFile(filePath, targetData, fileName, sourceData)

  // Split translated count between new and updated
  const updatedCount = Math.min(keysToUpdate.length, stats.translated)
  const newlyTranslated = stats.translated - updatedCount

  return {
    locale: localeCode,
    missingKeys: missingKeys.length,
    translated: newlyTranslated,
    updated: updatedCount,
    failed: stats.failed,
    removed
  }
}

const printSummary = (results: TranslationStats[], startTime: number): void => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  const totalTranslated = results.reduce((sum, r) => sum + r.translated, 0)
  const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0)
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)
  const totalRemoved = results.reduce((sum, r) => sum + r.removed, 0)

  console.log("\n" + "━".repeat(50))
  console.log("📊 Summary:")
  results.forEach((stat) => {
    const parts: string[] = []
    if (stat.translated > 0) parts.push(`${stat.translated} translated`)
    if (stat.updated > 0) parts.push(`${stat.updated} updated`)
    if (stat.failed > 0) parts.push(`${stat.failed} failed`)
    if (stat.removed > 0) parts.push(`${stat.removed} removed`)

    if (parts.length > 0) {
      console.log(`  ${stat.locale}: ${parts.join(", ")}`)
    }
  })
  console.log(`\n✨ Completed in ${duration}s`)

  const summary: string[] = []
  if (totalTranslated > 0) summary.push(`${totalTranslated} translations`)
  if (totalUpdated > 0) summary.push(`${totalUpdated} updated`)
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

  // Detect changed keys via lock file
  let changedKeys: string[] = []
  let frozenKeys: string[] = []
  let skippedKeys: string[] = []
  let lockValues: Record<string, string> = {}
  const lockFilePath = path.join(config.rootDir, LOCK_FILE_NAME)
  const trackingEnabled =
    config.trackChanges === TRACK_CHANGES.ON || config.trackChanges === TRACK_CHANGES.CAREFULLY

  if (config.forceRetranslate) {
    console.log(`🔄 Force mode enabled — all existing keys will be retranslated`)
    // Force mode clears frozen keys
    frozenKeys = []
  } else if (trackingEnabled) {
    const lockFile = await loadLockFile(lockFilePath)
    lockValues = lockFile.values
    frozenKeys = lockFile.frozen
    const isFirstRun = Object.keys(lockValues).length === 0

    if (isFirstRun) {
      console.log(`📸 First run with change tracking — creating lock file snapshot`)
    } else {
      // Log frozen keys
      if (frozenKeys.length > 0) {
        console.log(
          `🔒 ${frozenKeys.length} frozen key${frozenKeys.length > 1 ? "s" : ""} will be skipped`
        )
      }

      changedKeys = findChangedKeys(sourceData, sourceKeys, lockValues, frozenKeys)

      if (changedKeys.length > 0) {
        // Handle carefully mode with interactive prompts
        if (config.trackChanges === TRACK_CHANGES.CAREFULLY) {
          const { askChangedKeysAction, askPerKeyAction } = await import("@/interactive")
          const globalAction = await askChangedKeysAction(changedKeys.length, frozenKeys.length)

          if (globalAction === "skip-all") {
            // Skip all — keep all changed keys as-is, don't update their snapshots
            skippedKeys = [...changedKeys]
            changedKeys = []
            console.log(`\n⏭️  Skipped all changed keys`)
          } else if (globalAction === "review") {
            // Review one by one
            const keysToRetranslate: string[] = []
            const keysToSkip: string[] = []
            const keysToFreeze: string[] = []

            for (let i = 0; i < changedKeys.length; i++) {
              const key = changedKeys[i]
              const oldValue = lockValues[key] || ""
              const newValue = getNestedValue(sourceData, key) || ""

              const action = await askPerKeyAction(
                key,
                oldValue,
                newValue,
                i + 1,
                changedKeys.length
              )

              switch (action) {
                case "retranslate":
                  keysToRetranslate.push(key)
                  break
                case "skip":
                  keysToSkip.push(key)
                  break
                case "freeze":
                  keysToFreeze.push(key)
                  break
              }
            }

            // Add newly frozen keys to frozen list
            frozenKeys = [...frozenKeys, ...keysToFreeze]
            skippedKeys = keysToSkip
            changedKeys = keysToRetranslate

            console.log()
            if (keysToRetranslate.length > 0)
              console.log(
                `  🔄 ${keysToRetranslate.length} key${keysToRetranslate.length > 1 ? "s" : ""} to retranslate`
              )
            if (keysToSkip.length > 0)
              console.log(
                `  ⏭️  ${keysToSkip.length} key${keysToSkip.length > 1 ? "s" : ""} skipped`
              )
            if (keysToFreeze.length > 0)
              console.log(
                `  🔒 ${keysToFreeze.length} key${keysToFreeze.length > 1 ? "s" : ""} frozen`
              )
          } else {
            // retranslate-all — proceed as normal
            console.log(
              `\n🔄 Retranslating ${changedKeys.length} changed key${changedKeys.length > 1 ? "s" : ""}`
            )
          }
        } else {
          // ON mode — auto-retranslate all
          console.log(
            `🔄 Detected ${changedKeys.length} changed source key${changedKeys.length > 1 ? "s" : ""}: ${changedKeys.join(", ")}`
          )
        }
      } else {
        console.log(`📸 No source value changes detected`)
      }
    }
  }

  // Initialize provider
  const provider = getProvider(config.provider, config.apiKey, config.model)
  console.log(`🤖 Using provider: ${provider.name} (model: ${config.model})`)

  const results: TranslationStats[] = []
  for (const localeCode of targetLocales) {
    const stats = await processLocale(
      localeCode,
      sourceData,
      sourceKeys,
      changedKeys,
      config,
      provider
    )
    results.push(stats)
  }

  // Save lock file after successful sync (if tracking is enabled or force mode)
  if (trackingEnabled || config.forceRetranslate) {
    await saveLockFile(lockFilePath, sourceData, sourceKeys, frozenKeys, skippedKeys, lockValues)
    console.log(`\n📸 Lock file updated (${LOCK_FILE_NAME})`)
  }

  printSummary(results, startTime)
  return results
}
