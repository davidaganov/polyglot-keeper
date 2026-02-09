import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "node:fs/promises"
import { syncTranslations } from "@/core/sync"
import * as registry from "@/core/registry"
import * as utils from "@/utils"
import { LOCALE_FORMAT, type SyncConfig, type TranslationProvider } from "@/interfaces"

// Mock dependencies
vi.mock("node:fs/promises")
vi.mock("@/utils", async () => {
  const actual = await vi.importActual("@/utils")
  return {
    ...actual,
    fileExists: vi.fn(),
    sleep: vi.fn()
  }
})

// Mock Provider
const mockTranslateBatch = vi.fn()
class MockProvider implements TranslationProvider {
  name = "Mock"
  translateBatch = mockTranslateBatch
}

describe("Sync Core", () => {
  const mockConfig: SyncConfig = {
    provider: "mock" as any,
    model: "test-model",
    apiKey: "key",
    localeFormat: LOCALE_FORMAT.SHORT,
    locales: ["en", "ru"],
    defaultLocale: "en",
    rootDir: ".",
    localesDir: "locales",
    langDir: "locales",
    primaryLocaleFile: "locales/en.json",
    defaultLanguage: "en",
    batchSize: 10,
    batchDelay: 0,
    retryDelay: 0,
    maxRetries: 3
  }

  const sourceData = {
    greeting: "Hello",
    nested: {
      key: "Value"
    }
  }

  beforeEach(() => {
    vi.resetAllMocks()
    // Mock getProvider to return our mock provider
    vi.spyOn(registry, "getProvider").mockReturnValue(new MockProvider())

    // Default fs mocks
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(sourceData))
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    vi.mocked(utils.fileExists).mockResolvedValue(true)
  })

  it("should sync translations successfully when target file is missing", async () => {
    // Setup: Target file (ru.json) does not exist
    vi.mocked(utils.fileExists).mockImplementation(async (path) => {
      if (path.includes("en.json")) return true
      return false
    })

    // Mock translation
    mockTranslateBatch.mockResolvedValue({
      greeting: "Привет",
      "nested.key": "Значение"
    })

    const stats = await syncTranslations(mockConfig)

    // Verify
    expect(stats.length).toBe(1)
    expect(stats[0].locale).toBe("ru")
    expect(stats[0].translated).toBe(2)
    expect(stats[0].failed).toBe(0)

    // Verify provider call
    expect(mockTranslateBatch).toHaveBeenCalledWith(
      expect.objectContaining({ greeting: "Hello", "nested.key": "Value" }),
      "ru"
    )

    // Verify file save
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("ru.json"),
      expect.stringContaining("Привет"),
      "utf-8"
    )
  })

  it("should handle existing target file and only translate missing keys", async () => {
    // Setup: Target file exists but missing "nested.key"
    vi.mocked(utils.fileExists).mockResolvedValue(true)
    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      if (typeof path === "string" && path.includes("en.json")) return JSON.stringify(sourceData)
      if (typeof path === "string" && path.includes("ru.json"))
        return JSON.stringify({ greeting: "Привет" })
      return "{}"
    })

    mockTranslateBatch.mockResolvedValue({
      "nested.key": "Значение"
    })

    const stats = await syncTranslations(mockConfig)

    expect(stats[0].translated).toBe(1) // Only 1 missing key
    expect(mockTranslateBatch).toHaveBeenCalledWith({ "nested.key": "Value" }, "ru")
  })

  it("should remove obsolete keys", async () => {
    // Setup: Target has an extra key "old"
    vi.mocked(utils.fileExists).mockResolvedValue(true)
    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      if (typeof path === "string" && path.includes("en.json")) return JSON.stringify(sourceData)
      if (typeof path === "string" && path.includes("ru.json"))
        return JSON.stringify({
          greeting: "Привет",
          "nested.key": "Значение",
          old: "Delete me"
        })
      return "{}"
    })

    const stats = await syncTranslations(mockConfig)

    expect(stats[0].removed).toBe(1)
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("ru.json"),
      expect.not.stringContaining("old"), // Should not contain "old"
      "utf-8"
    )
  })

  it("should retry on rate limit", async () => {
    // Setup: Target missing keys
    vi.mocked(utils.fileExists).mockImplementation(async (path) => {
      if (path.includes("en.json")) return true
      return false
    })

    // Mock failure then success
    mockTranslateBatch
      .mockRejectedValueOnce(new Error("429 Too Many Requests"))
      .mockResolvedValue({ greeting: "Привет", "nested.key": "Значение" })

    const stats = await syncTranslations(mockConfig)

    expect(mockTranslateBatch).toHaveBeenCalledTimes(2)
    expect(stats[0].translated).toBe(2)
  })
})
