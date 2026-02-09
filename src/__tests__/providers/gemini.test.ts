import { describe, it, expect, vi, beforeEach } from "vitest"
import { GeminiProvider } from "@/providers/gemini"

global.fetch = vi.fn()

describe("GeminiProvider", () => {
  const apiKey = "test-key"
  const model = "gemini-flash"
  const provider = new GeminiProvider(apiKey, model)

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("should make correct API request", async () => {
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify({ key: "value" }) }]
          }
        }
      ]
    }

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const batch = { key: "value" }
    await provider.translateBatch(batch, "ru")

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      ),
      expect.objectContaining({
        method: "POST",
        body: expect.any(String)
      })
    )
  })

  it("should handle API errors", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => "Error message"
    } as Response)

    const batch = { key: "value" }
    await expect(provider.translateBatch(batch, "ru")).rejects.toThrow(
      "Gemini API error: 400 - Error message"
    )
  })
})
