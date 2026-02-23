import { beforeEach, describe, expect, it, vi } from "vitest"
import { API_PROVIDER, TRACK_CHANGES } from "@/interfaces"
import { setupMdSection } from "@/setup/md-setup"

vi.mock("@/setup/ui", () => ({
  section: vi.fn(),
  selectOne: vi.fn(),
  askText: vi.fn(),
  parseCommaSeparated: vi.fn((input: string) =>
    input
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
  ),
  exitWithError: vi.fn((message: string) => {
    throw new Error(message)
  })
}))

vi.mock("@/setup/shared-steps", () => ({
  askProvider: vi.fn(),
  askModel: vi.fn()
}))

vi.mock("@/utils/styles", () => ({
  c: {
    green: "",
    reset: "",
    bold: ""
  },
  icon: {
    check: "✓"
  }
}))

describe("setup/md-setup", () => {
  let askText: ReturnType<typeof vi.fn>
  let selectOne: ReturnType<typeof vi.fn>
  let askProvider: ReturnType<typeof vi.fn>
  let askModel: ReturnType<typeof vi.fn>
  let exitWithError: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    const ui = await import("@/setup/ui")
    const shared = await import("@/setup/shared-steps")

    askText = vi.mocked(ui.askText)
    selectOne = vi.mocked(ui.selectOne)
    exitWithError = vi.mocked(ui.exitWithError)
    askProvider = vi.mocked(shared.askProvider)
    askModel = vi.mocked(shared.askModel)
  })

  it("should keep same provider/model in both mode and still request separate markdown env var", async () => {
    askText
      .mockResolvedValueOnce("POLYGLOT_MD_API_KEY")
      .mockResolvedValueOnce("en, ru")
      .mockResolvedValueOnce("content")

    selectOne
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce("en")
      .mockResolvedValueOnce(TRACK_CHANGES.CAREFULLY)

    const result = await setupMdSection(
      ["EN", "RU"],
      "EN",
      true,
      API_PROVIDER.GEMINI,
      "gemini-flash-latest",
      "POLYGLOT_API_KEY"
    )

    expect(result).toEqual({
      contentDir: "content",
      defaultLocale: "en",
      locales: ["en", "ru"],
      trackChanges: TRACK_CHANGES.CAREFULLY,
      provider: API_PROVIDER.GEMINI,
      model: "gemini-flash-latest",
      envVarName: "POLYGLOT_MD_API_KEY"
    })

    expect(askText).toHaveBeenCalledWith("Which languages do you support?", "en, ru")
    expect(askText).toHaveBeenCalledWith("Where to store markdown files?", "content")
    expect(askText).toHaveBeenCalledWith(
      "API key variable name for Markdown",
      "POLYGLOT_MD_API_KEY"
    )
    expect(askProvider).not.toHaveBeenCalled()
    expect(askModel).not.toHaveBeenCalled()

    expect(selectOne).toHaveBeenNthCalledWith(
      2,
      "Which is your primary (source) language?",
      [
        { value: "en", label: "EN" },
        { value: "ru", label: "RU" }
      ],
      0
    )
  })

  it("should ask provider/model in markdown-only mode with markdown env default", async () => {
    askText
      .mockResolvedValueOnce("POLYGLOT_MD_API_KEY")
      .mockResolvedValueOnce("en, ru")
      .mockResolvedValueOnce("content")

    selectOne.mockResolvedValueOnce("en").mockResolvedValueOnce(TRACK_CHANGES.OFF)

    askProvider.mockResolvedValue(API_PROVIDER.OPENAI)
    askModel.mockResolvedValue("gpt-4o-mini")

    const result = await setupMdSection(undefined, undefined, false)

    expect(result?.provider).toBe(API_PROVIDER.OPENAI)
    expect(result?.model).toBe("gpt-4o-mini")
    expect(result?.envVarName).toBe("POLYGLOT_MD_API_KEY")
    expect(askProvider).toHaveBeenCalledTimes(1)
    expect(askModel).toHaveBeenCalledWith(API_PROVIDER.OPENAI)
  })

  it("should fail fast when languages list is empty", async () => {
    askProvider.mockResolvedValue(API_PROVIDER.GEMINI)
    askModel.mockResolvedValue("gemini-flash-latest")
    askText.mockResolvedValueOnce("POLYGLOT_MD_API_KEY").mockResolvedValueOnce("   ")

    await expect(setupMdSection()).rejects.toThrow("No languages specified")
    expect(exitWithError).toHaveBeenCalledWith("No languages specified")
  })
})
