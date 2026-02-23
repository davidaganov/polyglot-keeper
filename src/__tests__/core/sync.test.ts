import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "node:fs/promises"
import { syncTranslations } from "@/core/sync"
import * as registry from "@/core/registry"
import * as utils from "@/utils"
import {
  LOCALE_FORMAT,
  TRACK_CHANGES,
  type SyncConfig,
  type TranslationProvider
} from "@/interfaces"

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

// Mock interactive module (prevent stdin usage in tests)
vi.mock("@/interactive", () => ({
  askChangedKeysAction: vi.fn(),
  askPerKeyAction: vi.fn()
}))

// Mock Provider
const mockTranslateBatch = vi.fn()
const mockTranslateText = vi.fn()
class MockProvider implements TranslationProvider {
  name = "Mock"
  translateBatch = mockTranslateBatch
  translateText = mockTranslateText
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
    maxRetries: 3,
    trackChanges: TRACK_CHANGES.OFF,
    forceRetranslate: false
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

  it("should retranslate changed keys when trackChanges is ON", async () => {
    const configWithTracking: SyncConfig = {
      ...mockConfig,
      trackChanges: TRACK_CHANGES.ON,
      rootDir: "."
    }

    vi.mocked(utils.fileExists).mockResolvedValue(true)
    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      const p = typeof filePath === "string" ? filePath : ""
      if (p.includes("en.json")) {
        // Source has UPDATED value for "greeting"
        return JSON.stringify({ greeting: "Hello World", nested: { key: "Value" } })
      }
      if (p.includes("ru.json")) {
        return JSON.stringify({ greeting: "Привет", nested: { key: "Значение" } })
      }
      if (p.includes(".polyglot-lock.json")) {
        // Lock file has OLD value for "greeting"
        return JSON.stringify({
          json: {
            __frozen: [],
            values: {
              greeting: "Hello",
              "nested.key": "Value"
            }
          }
        })
      }
      return "{}"
    })

    mockTranslateBatch.mockResolvedValue({ greeting: "Привет мир" })

    const stats = await syncTranslations(configWithTracking)

    expect(stats[0].updated).toBe(1)
    expect(stats[0].translated).toBe(0) // No new missing keys
    expect(mockTranslateBatch).toHaveBeenCalledWith(
      expect.objectContaining({ greeting: "Hello World" }),
      "ru"
    )
  })

  it("should retranslate ALL keys when force mode is enabled", async () => {
    const configForce: SyncConfig = {
      ...mockConfig,
      forceRetranslate: true
    }

    vi.mocked(utils.fileExists).mockResolvedValue(true)
    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      const p = typeof filePath === "string" ? filePath : ""
      if (p.includes("en.json")) return JSON.stringify(sourceData)
      if (p.includes("ru.json"))
        return JSON.stringify({ greeting: "Привет", nested: { key: "Значение" } })
      return "{}"
    })

    mockTranslateBatch.mockResolvedValue({
      greeting: "Привет",
      "nested.key": "Значение"
    })

    const stats = await syncTranslations(configForce)

    // All existing keys should be retranslated
    expect(stats[0].updated).toBe(2)
    expect(stats[0].translated).toBe(0)
    expect(mockTranslateBatch).toHaveBeenCalledWith(
      expect.objectContaining({ greeting: "Hello", "nested.key": "Value" }),
      "ru"
    )
  })

  it("should NOT detect changes when trackChanges is OFF", async () => {
    // trackChanges is OFF by default in mockConfig
    vi.mocked(utils.fileExists).mockResolvedValue(true)
    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      const p = typeof filePath === "string" ? filePath : ""
      if (p.includes("en.json")) {
        return JSON.stringify({ greeting: "Hello World", nested: { key: "Value" } })
      }
      if (p.includes("ru.json")) {
        return JSON.stringify({ greeting: "Привет", nested: { key: "Значение" } })
      }
      return "{}"
    })

    const stats = await syncTranslations(mockConfig)

    // No translation should happen — all keys present, tracking disabled
    expect(stats[0].translated).toBe(0)
    expect(stats[0].updated).toBe(0)
    expect(mockTranslateBatch).not.toHaveBeenCalled()
  })

  it("should filter out frozen keys from change detection", async () => {
    const configWithTracking: SyncConfig = {
      ...mockConfig,
      trackChanges: TRACK_CHANGES.ON,
      rootDir: "."
    }

    vi.mocked(utils.fileExists).mockResolvedValue(true)
    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      const p = typeof filePath === "string" ? filePath : ""
      if (p.includes("en.json")) {
        // Both "greeting" and "nested.key" have changed values
        return JSON.stringify({ greeting: "Hello World", nested: { key: "New Value" } })
      }
      if (p.includes("ru.json")) {
        return JSON.stringify({ greeting: "Привет", nested: { key: "Значение" } })
      }
      if (p.includes(".polyglot-lock.json")) {
        // "greeting" is frozen — should NOT be retranslated even though it changed
        return JSON.stringify({
          json: {
            __frozen: ["greeting"],
            values: {
              greeting: "Hello",
              "nested.key": "Value"
            }
          }
        })
      }
      return "{}"
    })

    mockTranslateBatch.mockResolvedValue({ "nested.key": "Новое значение" })

    const stats = await syncTranslations(configWithTracking)

    // Only nested.key should be retranslated (greeting is frozen)
    expect(stats[0].updated).toBe(1)
    expect(mockTranslateBatch).toHaveBeenCalledWith(
      expect.objectContaining({ "nested.key": "New Value" }),
      "ru"
    )
    // Verify greeting was NOT sent for translation
    expect(mockTranslateBatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ greeting: expect.anything() }),
      "ru"
    )
  })

  it("should clear frozen keys when force mode is enabled", async () => {
    const configForce: SyncConfig = {
      ...mockConfig,
      forceRetranslate: true
    }

    vi.mocked(utils.fileExists).mockResolvedValue(true)
    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      const p = typeof filePath === "string" ? filePath : ""
      if (p.includes("en.json")) return JSON.stringify(sourceData)
      if (p.includes("ru.json"))
        return JSON.stringify({ greeting: "Привет", nested: { key: "Значение" } })
      if (p.includes(".polyglot-lock.json")) {
        return JSON.stringify({
          json: {
            __frozen: ["greeting"],
            values: {
              greeting: "Hello",
              "nested.key": "Value"
            }
          }
        })
      }
      return "{}"
    })

    mockTranslateBatch.mockResolvedValue({
      greeting: "Привет",
      "nested.key": "Значение"
    })

    const stats = await syncTranslations(configForce)

    // ALL keys retranslated (even previously frozen greeting)
    expect(stats[0].updated).toBe(2)

    // Verify lock file saved with empty json.__frozen
    const lockFileWriteCall = vi
      .mocked(fs.writeFile)
      .mock.calls.find(
        (call) => typeof call[0] === "string" && call[0].includes(".polyglot-lock.json")
      )
    expect(lockFileWriteCall).toBeDefined()
    const savedLockData = JSON.parse(lockFileWriteCall![1] as string)
    expect(savedLockData.json.__frozen).toEqual([])
  })

  it("should not update snapshot for skipped keys (carefully mode, skip-all)", async () => {
    const { askChangedKeysAction } = await import("@/interactive")

    const configCareful: SyncConfig = {
      ...mockConfig,
      trackChanges: TRACK_CHANGES.CAREFULLY,
      rootDir: "."
    }

    vi.mocked(askChangedKeysAction).mockResolvedValue("skip-all")

    vi.mocked(utils.fileExists).mockResolvedValue(true)
    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      const p = typeof filePath === "string" ? filePath : ""
      if (p.includes("en.json")) {
        return JSON.stringify({ greeting: "Hello World", nested: { key: "Value" } })
      }
      if (p.includes("ru.json")) {
        return JSON.stringify({ greeting: "Привет", nested: { key: "Значение" } })
      }
      if (p.includes(".polyglot-lock.json")) {
        return JSON.stringify({
          json: {
            __frozen: [],
            values: {
              greeting: "Hello",
              "nested.key": "Value"
            }
          }
        })
      }
      return "{}"
    })

    const stats = await syncTranslations(configCareful)

    // No retranslation
    expect(stats[0].updated).toBe(0)
    expect(stats[0].translated).toBe(0)
    expect(mockTranslateBatch).not.toHaveBeenCalled()

    // Verify lock file keeps OLD value for skipped key
    const lockFileWriteCall = vi
      .mocked(fs.writeFile)
      .mock.calls.find(
        (call) => typeof call[0] === "string" && call[0].includes(".polyglot-lock.json")
      )
    expect(lockFileWriteCall).toBeDefined()
    const savedLockData = JSON.parse(lockFileWriteCall![1] as string)
    // "greeting" should keep old value "Hello" (not "Hello World")
    expect(savedLockData.json.values.greeting).toBe("Hello")
  })

  it("should freeze keys in carefully mode (review, per-key freeze)", async () => {
    const { askChangedKeysAction, askPerKeyAction } = await import("@/interactive")

    const configCareful: SyncConfig = {
      ...mockConfig,
      trackChanges: TRACK_CHANGES.CAREFULLY,
      rootDir: "."
    }

    vi.mocked(askChangedKeysAction).mockResolvedValue("review")
    // First key: freeze, second key: retranslate
    vi.mocked(askPerKeyAction).mockResolvedValueOnce("freeze").mockResolvedValueOnce("retranslate")

    vi.mocked(utils.fileExists).mockResolvedValue(true)
    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      const p = typeof filePath === "string" ? filePath : ""
      if (p.includes("en.json")) {
        return JSON.stringify({ greeting: "Hello World", nested: { key: "New Value" } })
      }
      if (p.includes("ru.json")) {
        return JSON.stringify({ greeting: "Привет", nested: { key: "Значение" } })
      }
      if (p.includes(".polyglot-lock.json")) {
        return JSON.stringify({
          json: {
            __frozen: [],
            values: {
              greeting: "Hello",
              "nested.key": "Value"
            }
          }
        })
      }
      return "{}"
    })

    mockTranslateBatch.mockResolvedValue({ "nested.key": "Новое значение" })

    const stats = await syncTranslations(configCareful)

    // Only nested.key retranslated, greeting frozen
    expect(stats[0].updated).toBe(1)

    // Verify lock file has "greeting" in json.__frozen
    const lockFileWriteCall = vi
      .mocked(fs.writeFile)
      .mock.calls.find(
        (call) => typeof call[0] === "string" && call[0].includes(".polyglot-lock.json")
      )
    expect(lockFileWriteCall).toBeDefined()
    const savedLockData = JSON.parse(lockFileWriteCall![1] as string)
    expect(savedLockData.json.__frozen).toContain("greeting")
  })
})
