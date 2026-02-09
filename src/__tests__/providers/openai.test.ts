import { describe, it, expect, vi, beforeEach } from "vitest"
import { OpenAIProvider } from "@/providers/openai"

global.fetch = vi.fn()

describe("OpenAIProvider", () => {
  const apiKey = "test-key"
  const model = "gpt-4o-mini"
  const provider = new OpenAIProvider(apiKey, model)

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("should make correct API request", async () => {
    const mockResponse = {
      choices: [
        {
          message: { content: JSON.stringify({ key: "value" }) }
        }
      ]
    }

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(mockResponse),
      json: async () => mockResponse
    } as Response)

    const batch = { key: "value" }
    await provider.translateBatch(batch, "es")

    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${apiKey}`
        }),
        body: expect.stringContaining(model)
      })
    )
  })
})
