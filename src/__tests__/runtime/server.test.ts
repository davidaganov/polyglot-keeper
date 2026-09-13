import { describe, it, expect } from "vitest"
import { createTranslateHandler } from "@/runtime/server"
import { API_PROVIDER } from "@/interfaces"

const makeRequest = (body: unknown, method = "POST"): Request =>
  new Request("http://localhost/api/translate", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })

const mockGeminiResponse = {
  candidates: [{ content: { parts: [{ text: JSON.stringify({ __text: "[ru] Hello" }) }] } }]
}

describe("createTranslateHandler", () => {
  it("returns 405 for non-POST requests", async () => {
    const handler = createTranslateHandler({ keys: { [API_PROVIDER.GEMINI]: "key" } })
    const res = await handler(new Request("http://localhost/api/translate", { method: "GET" }))
    expect(res.status).toBe(405)
  })

  it("returns 400 for invalid JSON body", async () => {
    const handler = createTranslateHandler({ keys: { [API_PROVIDER.GEMINI]: "key" } })
    const res = await handler(
      new Request("http://localhost/api/translate", {
        method: "POST",
        body: "not-json"
      })
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/Invalid JSON/)
  })

  it("returns 400 when required fields are missing", async () => {
    const handler = createTranslateHandler({ keys: { [API_PROVIDER.GEMINI]: "key" } })
    const res = await handler(makeRequest({ batch: { a: "b" } }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when targetLang is not in allowedLocales", async () => {
    const handler = createTranslateHandler({
      keys: { [API_PROVIDER.GEMINI]: "key" },
      allowedLocales: ["en", "de"]
    })
    const res = await handler(
      makeRequest({
        batch: { __text: "Hello" },
        targetLang: "ru",
        provider: API_PROVIDER.GEMINI,
        model: "gemini-flash-latest"
      })
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/not in the allowed list/)
  })

  it("returns 500 when no API key is configured for the provider", async () => {
    const handler = createTranslateHandler({ keys: {} })
    const res = await handler(
      makeRequest({
        batch: { __text: "Hello" },
        targetLang: "ru",
        provider: API_PROVIDER.GEMINI,
        model: "gemini-flash-latest"
      })
    )
    expect(res.status).toBe(500)
  })

  it("returns 200 with translations on success", async () => {
    globalThis.fetch = async () =>
      ({
        ok: true,
        json: async () => mockGeminiResponse,
        text: async () => ""
      }) as unknown as Response

    const handler = createTranslateHandler({
      keys: { [API_PROVIDER.GEMINI]: "test-api-key" }
    })

    const res = await handler(
      makeRequest({
        batch: { __text: "Hello" },
        targetLang: "ru",
        provider: API_PROVIDER.GEMINI,
        model: "gemini-flash-latest"
      })
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty("translations")
    expect(data.translations.__text).toBe("[ru] Hello")
  })

  it("returns 502 when the provider throws", async () => {
    globalThis.fetch = async () => {
      throw new Error("Network error")
    }

    const handler = createTranslateHandler({
      keys: { [API_PROVIDER.GEMINI]: "test-api-key" }
    })

    const res = await handler(
      makeRequest({
        batch: { __text: "Hello" },
        targetLang: "ru",
        provider: API_PROVIDER.GEMINI,
        model: "gemini-flash-latest"
      })
    )

    expect(res.status).toBe(502)
    const data = await res.json()
    expect(data.error).toMatch(/Translation failed/)
  })
})
