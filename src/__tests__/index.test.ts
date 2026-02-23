import { beforeEach, describe, expect, it, vi } from "vitest"

const mockRunSetupWizard = vi.fn()
const mockSyncTranslations = vi.fn()
const mockSyncMarkdownTranslations = vi.fn()
const mockFindConfigFile = vi.fn()
const mockLoadConfig = vi.fn()
const mockMergeWithDefaults = vi.fn()

vi.mock("dotenv", () => ({
  default: {
    config: vi.fn()
  }
}))

vi.mock("@/setup", () => ({
  runSetupWizard: mockRunSetupWizard
}))

vi.mock("@/core", () => ({
  registerProvider: vi.fn(),
  syncTranslations: mockSyncTranslations,
  syncMarkdownTranslations: mockSyncMarkdownTranslations
}))

vi.mock("@/config-loader", () => ({
  findConfigFile: mockFindConfigFile,
  loadConfig: mockLoadConfig,
  mergeWithDefaults: mockMergeWithDefaults
}))

vi.mock("@/providers", () => ({
  GeminiProvider: class {},
  OpenAIProvider: class {},
  AnthropicProvider: class {},
  geminiDefaultModel: "gemini-flash-latest",
  openaiDefaultModel: "gpt-4o-mini",
  anthropicDefaultModel: "claude-3-5-sonnet-latest"
}))

describe("run (runtime validation)", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.POLYGLOT_API_KEY = "json-key"
    process.env.POLYGLOT_MD_API_KEY = "md-key"
  })

  it("should require init when config file is missing", async () => {
    mockFindConfigFile.mockResolvedValue(null)

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("EXIT")
    }) as any)

    const { run } = await import("@/index")

    await expect(run({ rootDir: "E:/tmp" })).rejects.toThrow("EXIT")

    expect(errorSpy).toHaveBeenCalledWith(
      "❌ No configuration found. Run `npx polyglot-keeper init` first."
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it("should fail with deprecated message when selected mode section is missing", async () => {
    mockFindConfigFile.mockResolvedValue("polyglot.config.json")
    mockLoadConfig.mockResolvedValue({ envFile: ".env" })
    mockMergeWithDefaults.mockReturnValue({ envFile: ".env" })

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("EXIT")
    }) as any)

    const { run } = await import("@/index")

    await expect(run({ rootDir: "E:/tmp", md: true })).rejects.toThrow("EXIT")

    expect(errorSpy).toHaveBeenCalledWith(
      '❌ Invalid or deprecated config: missing "markdown" section in polyglot.config.json. Please run `npx polyglot-keeper init` again.'
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it("should fail when mode section misses provider/model/envVarName", async () => {
    mockFindConfigFile.mockResolvedValue("polyglot.config.json")
    mockLoadConfig.mockResolvedValue({ envFile: ".env", json: {} })
    mockMergeWithDefaults.mockReturnValue({
      envFile: ".env",
      json: {
        localeFormat: "short",
        locales: ["EN", "RU"],
        defaultLocale: "EN",
        localesDir: "src/i18n"
      }
    })

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("EXIT")
    }) as any)

    const { run } = await import("@/index")

    await expect(run({ rootDir: "E:/tmp" })).rejects.toThrow("EXIT")

    expect(errorSpy).toHaveBeenCalledWith(
      '❌ Invalid or deprecated config: "json" section must include provider, model, and envVarName. Please run `npx polyglot-keeper init` again.'
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it("should route --md mode to markdown sync with markdown config", async () => {
    mockFindConfigFile.mockResolvedValue("polyglot.config.json")
    mockLoadConfig.mockResolvedValue({
      envFile: ".env",
      markdown: {
        provider: "gemini",
        model: "gemini-flash-latest",
        envVarName: "POLYGLOT_MD_API_KEY",
        contentDir: "content",
        defaultLocale: "en",
        locales: ["en", "ru"],
        exclude: ["drafts/**"]
      }
    })
    mockMergeWithDefaults.mockReturnValue({
      envFile: ".env",
      markdown: {
        provider: "gemini",
        model: "gemini-flash-latest",
        envVarName: "POLYGLOT_MD_API_KEY",
        contentDir: "content",
        defaultLocale: "en",
        locales: ["en", "ru"],
        trackChanges: "off",
        batchDelay: 2000,
        retryDelay: 35000,
        maxRetries: 3,
        exclude: ["drafts/**"]
      }
    })

    const { run } = await import("@/index")

    await run({ rootDir: "E:/tmp", md: true })

    expect(mockSyncTranslations).not.toHaveBeenCalled()
    expect(mockSyncMarkdownTranslations).toHaveBeenCalledWith(
      expect.objectContaining({
        rootDir: "E:/tmp",
        contentDir: "content",
        defaultLocale: "en",
        locales: ["en", "ru"],
        exclude: ["drafts/**"]
      })
    )
  })
})
