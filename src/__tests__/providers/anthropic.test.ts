import { describe, it, expect, vi, beforeEach } from "vitest"
import { AnthropicProvider } from "@/providers/anthropic"

global.fetch = vi.fn()

describe("AnthropicProvider", () => {
  const apiKey = "test-key"
  const model = "claude-3-opus"
  const provider = new AnthropicProvider(apiKey, model)

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("should make correct API request", async () => {
    const mockResponse = {
      content: [
        {
          text: JSON.stringify({ key: "value" })
        }
      ]
    }

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(mockResponse),
      json: async () => mockResponse
    } as Response)

    const batch = { key: "value" }
    await provider.translateBatch(batch, "fr")

    expect(fetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-key": apiKey
        })
      })
    )
  })
})
