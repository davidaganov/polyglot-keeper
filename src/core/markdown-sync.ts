import fs from "node:fs/promises"
import path from "node:path"
import { createHash } from "node:crypto"
import { getProvider } from "@/core/registry"
import { TRACK_CHANGES, type MarkdownSyncConfig, type TranslationBatch } from "@/interfaces"
import { askChangedKeysAction, askPerKeyAction } from "@/interactive"
import { fileExists, sleep } from "@/utils"

const LOCK_FILE_NAME = ".polyglot-lock.json"
const CODE_BLOCK_TOKEN_PREFIX = "__PGK_CODE_BLOCK_"

type SourceFile = { relativePath: string; content: string }

type LockSectionData = {
  __frozen: string[]
  values: Record<string, string>
}

type LockFileData = {
  json?: LockSectionData
  md?: LockSectionData
  [key: string]: unknown
}

const toPosix = (value: string): string => value.replace(/\\/g, "/")

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const globToRegex = (pattern: string): RegExp => {
  const normalized = toPosix(pattern)
  const escaped = escapeRegex(normalized)
  const regexBody = escaped.replace(/\\\*\\\*/g, "::DOUBLE_STAR::").replace(/\\\*/g, "[^/]*")
  return new RegExp(`^${regexBody.replace(/::DOUBLE_STAR::/g, ".*")}$`, "i")
}

const createExcludeMatcher = (exclude: string[]): ((value: string) => boolean) => {
  const regexes = exclude.map(globToRegex)
  return (value: string): boolean => {
    const normalized = toPosix(value)
    return regexes.some((regex) => regex.test(normalized) || regex.test(path.basename(normalized)))
  }
}

const normalizeEol = (value: string): string => value.replace(/\r\n/g, "\n")

const contentHash = (value: string): string =>
  createHash("sha256").update(normalizeEol(value), "utf-8").digest("hex")

const shortHash = (hash: string): string => hash.slice(0, 12)

const protectCodeBlocks = (value: string): { text: string; replacements: Map<string, string> } => {
  const replacements = new Map<string, string>()
  let index = 0

  const text = value.replace(/```[\s\S]*?```/g, (block) => {
    const token = `${CODE_BLOCK_TOKEN_PREFIX}${index++}__`
    replacements.set(token, block)
    return token
  })

  return { text, replacements }
}

const restoreCodeBlocks = (value: string, replacements: Map<string, string>): string => {
  let restored = value
  for (const [token, block] of replacements.entries()) {
    restored = restored.replace(new RegExp(escapeRegex(token), "g"), block)
  }
  return restored
}

const loadMarkdownLock = async (
  rootDir: string
): Promise<{ values: Record<string, string>; frozen: string[] }> => {
  const unifiedLockPath = path.join(rootDir, LOCK_FILE_NAME)
  if (await fileExists(unifiedLockPath)) {
    const raw = JSON.parse(await fs.readFile(unifiedLockPath, "utf-8")) as LockFileData
    const section = raw.md
    if (section && typeof section === "object") {
      return {
        values: section.values ?? {},
        frozen: Array.isArray(section.__frozen) ? section.__frozen : []
      }
    }
  }

  return { values: {}, frozen: [] }
}

const saveMarkdownLock = async (
  rootDir: string,
  values: Record<string, string>,
  frozen: string[]
): Promise<void> => {
  const lockPath = path.join(rootDir, LOCK_FILE_NAME)
  let existing: LockFileData = {}

  if (await fileExists(lockPath)) {
    try {
      existing = JSON.parse(await fs.readFile(lockPath, "utf-8")) as LockFileData
    } catch {
      existing = {}
    }
  }

  const next: LockFileData = {
    ...existing,
    md: {
      __frozen: frozen,
      values
    }
  }

  await fs.writeFile(lockPath, JSON.stringify(next, null, 2) + "\n", "utf-8")
}

const collectSourceFiles = async (
  sourceDir: string,
  excludeMatcher: (value: string) => boolean,
  rootDir: string = sourceDir
): Promise<SourceFile[]> => {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true })
  const result: SourceFile[] = []

  for (const entry of entries) {
    const absolutePath = path.join(sourceDir, entry.name)
    const relativePath = toPosix(path.relative(rootDir, absolutePath))

    if (excludeMatcher(relativePath)) continue

    if (entry.isDirectory()) {
      result.push(...(await collectSourceFiles(absolutePath, excludeMatcher, rootDir)))
      continue
    }

    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue

    const content = await fs.readFile(absolutePath, "utf-8")
    result.push({ relativePath, content })
  }

  return result
}

const translateMarkdownWithRetry = async (
  translateBatch: (batch: TranslationBatch, targetLang: string) => Promise<TranslationBatch>,
  text: string,
  targetLang: string,
  config: MarkdownSyncConfig,
  retries: number = config.maxRetries
): Promise<string> => {
  try {
    const translated = await translateBatch({ content: text }, targetLang)
    return translated.content ?? Object.values(translated)[0] ?? text
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const isRateLimit = message.includes("429")

    if (retries > 0 && isRateLimit) {
      console.log(
        `  ⚠️  Rate limited. Retrying in ${config.retryDelay / 1000}s... (${retries} retries left)`
      )
      await sleep(config.retryDelay)
      return translateMarkdownWithRetry(translateBatch, text, targetLang, config, retries - 1)
    }

    throw error
  }
}

export const syncMarkdownTranslations = async (config: MarkdownSyncConfig): Promise<void> => {
  console.log("🌍 Markdown Translation Synchronization Tool")
  console.log("━".repeat(50))

  const provider = getProvider(config.provider, config.apiKey, config.model)
  const sourceDir = path.resolve(config.rootDir, config.contentDir, config.defaultLocale)
  const excludeMatcher = createExcludeMatcher(config.exclude ?? [])

  if (!(await fileExists(sourceDir))) {
    throw new Error(`Primary markdown locale directory not found at ${sourceDir}`)
  }

  const sourceFiles = await collectSourceFiles(sourceDir, excludeMatcher)
  const { values: previousHashes, frozen: previousFrozen } = await loadMarkdownLock(config.rootDir)
  const currentHashes: Record<string, string> = Object.fromEntries(
    sourceFiles.map((file) => [file.relativePath, contentHash(file.content)])
  )
  const frozenSet = new Set(previousFrozen)
  if (config.forceRetranslate) frozenSet.clear()

  console.log(
    `📂 Loaded source markdown locale (${config.defaultLocale}) with ${sourceFiles.length} files`
  )

  const targetLocales = config.locales.filter((locale) => locale !== config.defaultLocale)
  console.log(`🎯 Target locales: ${targetLocales.join(", ") || "none"}`)

  const changedFiles = sourceFiles
    .filter((file) => {
      if (frozenSet.has(file.relativePath)) return false
      const previous = previousHashes[file.relativePath]
      const current = currentHashes[file.relativePath]
      return previous !== undefined && previous !== current
    })
    .map((file) => file.relativePath)

  const changedSet = new Set<string>()
  const skippedSet = new Set<string>()

  if (config.trackChanges === TRACK_CHANGES.ON) {
    for (const changed of changedFiles) changedSet.add(changed)
  }

  if (config.trackChanges === TRACK_CHANGES.CAREFULLY && changedFiles.length > 0) {
    const action = await askChangedKeysAction(changedFiles.length, frozenSet.size)

    if (action === "retranslate-all") {
      for (const changed of changedFiles) changedSet.add(changed)
    }

    if (action === "skip-all") {
      for (const changed of changedFiles) skippedSet.add(changed)
    }

    if (action === "review") {
      for (let i = 0; i < changedFiles.length; i++) {
        const filePath = changedFiles[i]
        const sourceFile = sourceFiles.find((file) => file.relativePath === filePath)
        if (!sourceFile) continue

        const perAction = await askPerKeyAction(
          filePath,
          `hash:${shortHash(previousHashes[filePath] ?? "")}`,
          `hash:${shortHash(currentHashes[filePath])}`,
          i + 1,
          changedFiles.length
        )

        if (perAction === "retranslate") {
          changedSet.add(filePath)
          continue
        }

        if (perAction === "freeze") {
          frozenSet.add(filePath)
        }

        skippedSet.add(filePath)
      }
    }
  }

  for (const locale of targetLocales) {
    const targetLocaleDir = path.resolve(config.rootDir, config.contentDir, locale)
    let translated = 0

    for (let i = 0; i < sourceFiles.length; i++) {
      const sourceFile = sourceFiles[i]
      const targetFilePath = path.join(targetLocaleDir, sourceFile.relativePath)
      const hasTarget = await fileExists(targetFilePath)
      const sourceChanged = changedSet.has(sourceFile.relativePath)

      if (!config.forceRetranslate && frozenSet.has(sourceFile.relativePath)) {
        continue
      }

      if (!config.forceRetranslate && skippedSet.has(sourceFile.relativePath)) {
        continue
      }

      const shouldTranslate = config.forceRetranslate || !hasTarget || sourceChanged

      if (!shouldTranslate) continue

      await fs.mkdir(path.dirname(targetFilePath), { recursive: true })
      const { text: protectedSource, replacements } = protectCodeBlocks(sourceFile.content)
      const translatedContent = await translateMarkdownWithRetry(
        provider.translateBatch.bind(provider),
        protectedSource,
        locale,
        config
      )
      const safeContent = restoreCodeBlocks(translatedContent, replacements)

      await fs.writeFile(targetFilePath, safeContent, "utf-8")
      translated++

      if (i < sourceFiles.length - 1) {
        await sleep(config.batchDelay)
      }
    }

    console.log(
      `✅ ${locale}: translated ${translated} markdown file${translated === 1 ? "" : "s"}`
    )
  }

  const nextValues: Record<string, string> = {}
  for (const sourceFile of sourceFiles) {
    const previousHash = previousHashes[sourceFile.relativePath]
    if (skippedSet.has(sourceFile.relativePath) && previousHash !== undefined) {
      nextValues[sourceFile.relativePath] = previousHash
    } else {
      nextValues[sourceFile.relativePath] = currentHashes[sourceFile.relativePath]
    }
  }

  await saveMarkdownLock(config.rootDir, nextValues, Array.from(frozenSet))
  console.log(`📸 Lock file updated (${LOCK_FILE_NAME} -> md section)`)
}
