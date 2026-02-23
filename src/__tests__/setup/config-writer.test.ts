import { describe, it, expect } from "vitest"
import { TRACK_CHANGES, type UserConfig } from "@/interfaces"
import { generateConfigFile } from "@/setup/config-writer"

describe("setup/config-writer", () => {
  it("should write section-based config without deprecated top-level provider/model/envVarName", () => {
    const config: UserConfig = {
      envFile: ".env.local",
      json: {
        provider: "gemini" as any,
        model: "gemini-flash-latest",
        envVarName: "POLYGLOT_API_KEY",
        localeFormat: "short" as any,
        locales: ["EN", "RU"],
        defaultLocale: "EN",
        localesDir: "src/i18n"
      }
    }

    const parsed = JSON.parse(generateConfigFile(config))

    expect(parsed.envFile).toBe(".env.local")
    expect(parsed.provider).toBeUndefined()
    expect(parsed.model).toBeUndefined()
    expect(parsed.envVarName).toBeUndefined()

    expect(parsed.json.provider).toBe("gemini")
    expect(parsed.json.model).toBe("gemini-flash-latest")
    expect(parsed.json.envVarName).toBe("POLYGLOT_API_KEY")
  })

  it("should serialize optional tuning fields for both json and markdown sections", () => {
    const config: UserConfig = {
      envFile: ".env",
      json: {
        provider: "openai" as any,
        model: "gpt-4o-mini",
        envVarName: "POLYGLOT_API_KEY",
        localeFormat: "short" as any,
        locales: ["EN", "RU"],
        defaultLocale: "EN",
        localesDir: "src/i18n",
        trackChanges: TRACK_CHANGES.CAREFULLY,
        batchSize: 50,
        batchDelay: 500,
        retryDelay: 7000,
        maxRetries: 4
      },
      markdown: {
        provider: "anthropic" as any,
        model: "claude-3-5-sonnet-latest",
        envVarName: "POLYGLOT_MD_API_KEY",
        contentDir: "content",
        defaultLocale: "en",
        locales: ["en", "ru"],
        trackChanges: TRACK_CHANGES.ON,
        batchSize: 25,
        batchDelay: 300,
        retryDelay: 6000,
        maxRetries: 2
      }
    }

    const parsed = JSON.parse(generateConfigFile(config))

    expect(parsed.json.batchSize).toBe(50)
    expect(parsed.json.batchDelay).toBe(500)
    expect(parsed.json.retryDelay).toBe(7000)
    expect(parsed.json.maxRetries).toBe(4)

    expect(parsed.markdown.batchSize).toBe(25)
    expect(parsed.markdown.batchDelay).toBe(300)
    expect(parsed.markdown.retryDelay).toBe(6000)
    expect(parsed.markdown.maxRetries).toBe(2)
  })

  it("should omit trackChanges when it is OFF", () => {
    const config: UserConfig = {
      envFile: ".env",
      markdown: {
        provider: "gemini" as any,
        model: "gemini-flash-latest",
        envVarName: "POLYGLOT_MD_API_KEY",
        contentDir: "content",
        defaultLocale: "en",
        locales: ["en", "ru"],
        trackChanges: TRACK_CHANGES.OFF
      }
    }

    const parsed = JSON.parse(generateConfigFile(config))

    expect(parsed.markdown.trackChanges).toBeUndefined()
  })

  it("should serialize exclude array for markdown when present", () => {
    const config: UserConfig = {
      envFile: ".env",
      markdown: {
        provider: "gemini" as any,
        model: "gemini-flash-latest",
        envVarName: "POLYGLOT_MD_API_KEY",
        contentDir: "content",
        defaultLocale: "en",
        locales: ["en", "ru"],
        exclude: ["drafts/**", "private/**", "README.md"]
      }
    }

    const parsed = JSON.parse(generateConfigFile(config))

    expect(parsed.markdown.exclude).toEqual(["drafts/**", "private/**", "README.md"])
  })

  it("should omit exclude when it is empty array or undefined", () => {
    const configWithEmpty: UserConfig = {
      envFile: ".env",
      markdown: {
        provider: "gemini" as any,
        model: "gemini-flash-latest",
        envVarName: "POLYGLOT_MD_API_KEY",
        contentDir: "content",
        defaultLocale: "en",
        locales: ["en", "ru"],
        exclude: []
      }
    }

    const configWithUndefined: UserConfig = {
      envFile: ".env",
      markdown: {
        provider: "gemini" as any,
        model: "gemini-flash-latest",
        envVarName: "POLYGLOT_MD_API_KEY",
        contentDir: "content",
        defaultLocale: "en",
        locales: ["en", "ru"]
      }
    }

    const parsedEmpty = JSON.parse(generateConfigFile(configWithEmpty))
    const parsedUndefined = JSON.parse(generateConfigFile(configWithUndefined))

    expect(parsedEmpty.markdown.exclude).toBeUndefined()
    expect(parsedUndefined.markdown.exclude).toBeUndefined()
  })
})
