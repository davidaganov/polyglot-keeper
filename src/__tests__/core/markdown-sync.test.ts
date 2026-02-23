import { beforeEach, describe, expect, it, vi } from "vitest"
import fs from "node:fs/promises"
import { createHash } from "node:crypto"
import { syncMarkdownTranslations } from "@/core/markdown-sync"
import * as registry from "@/core/registry"
import * as utils from "@/utils"
import { TRACK_CHANGES, type MarkdownSyncConfig, type TranslationBatch } from "@/interfaces"

const hash = (value: string): string =>
  createHash("sha256").update(value.replace(/\r\n/g, "\n"), "utf-8").digest("hex")

vi.mock("node:fs/promises")
vi.mock("@/utils", async () => {
  const actual = await vi.importActual("@/utils")
  return {
    ...actual,
    fileExists: vi.fn(),
    sleep: vi.fn()
  }
})
vi.mock("@/interactive", () => ({
  askChangedKeysAction: vi.fn(),
  askPerKeyAction: vi.fn()
}))

const mockTranslateBatch =
  vi.fn<(batch: TranslationBatch, targetLang: string) => Promise<TranslationBatch>>()

describe("Markdown Sync Core", () => {
  const config: MarkdownSyncConfig = {
    apiKey: "key",
    rootDir: "E:/tmp",
    contentDir: "content",
    defaultLocale: "en",
    locales: ["en", "ru"],
    provider: "gemini" as any,
    model: "gemini-flash-latest",
    trackChanges: TRACK_CHANGES.CAREFULLY,
    forceRetranslate: false,
    batchDelay: 0,
    retryDelay: 0,
    maxRetries: 1
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(registry, "getProvider").mockReturnValue({
      name: "Mock",
      translateBatch: mockTranslateBatch
    } as any)
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    vi.mocked(utils.sleep).mockResolvedValue(undefined)
  })

  it("does not retranslate unchanged markdown on second run", async () => {
    const sourceContent = "# Title\n\nBody\n"

    vi.mocked(utils.fileExists).mockImplementation(async (filePath) => {
      const p = String(filePath).replace(/\\/g, "/")
      if (p.includes("content/en")) return true
      if (p.includes("content/ru/readme.md")) return true
      if (p.includes(".polyglot-lock.json")) return true
      return false
    })

    vi.mocked(fs.readdir).mockResolvedValue([
      { name: "readme.md", isDirectory: () => false, isFile: () => true }
    ] as any)

    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      const p = String(filePath).replace(/\\/g, "/")
      if (p.includes("content/en/readme.md")) return sourceContent
      if (p.includes(".polyglot-lock.json")) {
        return JSON.stringify({
          md: {
            __frozen: [],
            values: {
              "readme.md": hash(sourceContent)
            }
          }
        })
      }
      return ""
    })

    await syncMarkdownTranslations(config)

    expect(mockTranslateBatch).not.toHaveBeenCalled()
    expect(fs.writeFile).not.toHaveBeenCalledWith(
      expect.stringContaining("content/ru/readme.md"),
      expect.any(String),
      "utf-8"
    )
  })

  it("preserves fenced code blocks in translated markdown and saves md lock section", async () => {
    const sourceContent = '# Title\n\n```js\nconsole.log("test")\n```\n'

    vi.mocked(utils.fileExists).mockImplementation(async (filePath) => {
      const p = String(filePath).replace(/\\/g, "/")
      if (p.includes("content/en")) return true
      if (p.includes("content/ru/readme.md")) return false
      if (p.includes(".polyglot-lock.json")) return false
      return false
    })

    vi.mocked(fs.readdir).mockResolvedValue([
      { name: "readme.md", isDirectory: () => false, isFile: () => true }
    ] as any)

    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      const p = String(filePath).replace(/\\/g, "/")
      if (p.includes("content/en/readme.md")) return sourceContent
      return ""
    })

    mockTranslateBatch.mockResolvedValue({
      content: "# Заголовок\n\n__PGK_CODE_BLOCK_0__\n"
    })

    await syncMarkdownTranslations({ ...config, trackChanges: TRACK_CHANGES.OFF })

    const targetWrite = vi
      .mocked(fs.writeFile)
      .mock.calls.find((call) =>
        String(call[0]).replace(/\\/g, "/").includes("content/ru/readme.md")
      )
    expect(targetWrite).toBeDefined()
    expect(String(targetWrite![1])).toContain("```js")
    expect(String(targetWrite![1])).toContain('console.log("test")')

    const lockWrite = vi
      .mocked(fs.writeFile)
      .mock.calls.find((call) =>
        String(call[0]).replace(/\\/g, "/").includes(".polyglot-lock.json")
      )
    expect(lockWrite).toBeDefined()
    const saved = JSON.parse(String(lockWrite![1]))
    expect(saved.md.values["readme.md"]).toBe(hash(sourceContent))
  })
})
