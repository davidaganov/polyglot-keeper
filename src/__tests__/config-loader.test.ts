import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "node:fs/promises"
import { loadConfig, findConfigFile, mergeWithDefaults } from "@/config-loader"
import * as utils from "@/utils"
import { LOCALE_FORMAT } from "@/interfaces"

vi.mock("node:fs/promises")
vi.mock("@/utils", async () => {
  const actual = await vi.importActual("@/utils")
  return {
    ...actual,
    fileExists: vi.fn()
  }
})

describe("Config Loader", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe("findConfigFile", () => {
    it("should find existing config file", async () => {
      vi.mocked(utils.fileExists).mockImplementation(async (path) =>
        path.includes("polyglot.config.json")
      )
      const configPath = await findConfigFile(".")
      expect(configPath).toContain("polyglot.config.json")
    })

    it("should return null if no config found", async () => {
      vi.mocked(utils.fileExists).mockResolvedValue(false)
      const configPath = await findConfigFile(".")
      expect(configPath).toBeNull()
    })
  })

  describe("loadConfig", () => {
    it("should load and parse config", async () => {
      const mockConfig = {
        envFile: ".env",
        json: {
          provider: "gemini",
          model: "gemini-flash-latest",
          envVarName: "POLYGLOT_API_KEY",
          localeFormat: "short",
          locales: ["EN", "RU"],
          defaultLocale: "EN",
          localesDir: "src/i18n"
        }
      }
      vi.mocked(utils.fileExists).mockResolvedValue(true)
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig))

      const config = await loadConfig(".")
      expect(config).toEqual(mockConfig)
    })
  })

  describe("mergeWithDefaults", () => {
    it("should merge user config with defaults", () => {
      const userConfig = {
        json: {
          localeFormat: LOCALE_FORMAT.PAIR,
          locales: ["en"],
          defaultLocale: "en",
          localesDir: "locales"
        }
      }
      const merged = mergeWithDefaults(userConfig)

      expect(merged.json?.localeFormat).toBe(LOCALE_FORMAT.PAIR)
      expect(merged.json?.batchSize).toBeDefined()
      expect(merged.json?.retryDelay).toBe(35000)
      expect(merged.json?.maxRetries).toBe(3)
    })
  })
})
