import { describe, it, expect, vi, beforeEach } from "vitest"
import { PolyglotRuntime } from "@/runtime/client"
import { API_PROVIDER } from "@/interfaces"

// vi.mock is hoisted to the top of the file by Vitest, so we cannot reference
// outer variables inside the factory. Instead, we keep the mock fn on a shared
// object that both the factory and the tests can access.
const shared = {
  translateBatch: vi.fn(async (batch: Record<string, string>) => {
    const result: Record<string, string> = {}
    for (const [k, v] of Object.entries(batch)) result[k] = `[ru] ${v}`
    return result
  })
}

vi.mock("@/providers", () => {
  // NOTE: `shared` is captured by closure here after hoisting, which works
  // because the factory runs lazily (on first import), not during hoisting.
  class GeminiProvider {
    name = "Gemini"
    translateBatch(...args: Parameters<typeof shared.translateBatch>) {
      return shared.translateBatch(...args)
    }
  }
  class OpenAIProvider {
    name = "OpenAI"
    translateBatch(...args: Parameters<typeof shared.translateBatch>) {
      return shared.translateBatch(...args)
    }
  }
  class AnthropicProvider {
    name = "Anthropic"
    translateBatch(...args: Parameters<typeof shared.translateBatch>) {
      return shared.translateBatch(...args)
    }
  }
  return { GeminiProvider, OpenAIProvider, AnthropicProvider }
})

beforeEach(() => {
  shared.translateBatch.mockClear()
})

const makeRuntime = () => {
  const rt = new PolyglotRuntime()
  rt.init({ provider: API_PROVIDER.GEMINI, apiKey: "test-key" })
  return rt
}

describe("PolyglotRuntime", () => {
  describe("init", () => {
    it("throws when neither apiKey nor endpoint is provided", () => {
      const rt = new PolyglotRuntime()
      expect(() => rt.init({ provider: API_PROVIDER.GEMINI })).toThrow(
        "RuntimeConfig requires either"
      )
    })

    it("initialises successfully with apiKey", () => {
      const rt = new PolyglotRuntime()
      expect(() => rt.init({ provider: API_PROVIDER.GEMINI, apiKey: "key" })).not.toThrow()
    })

    it("initialises successfully with endpoint", () => {
      const rt = new PolyglotRuntime()
      expect(() =>
        rt.init({ provider: API_PROVIDER.GEMINI, endpoint: "/api/translate" })
      ).not.toThrow()
    })
  })

  describe("t — single string translation", () => {
    it("translates a string and returns a string", async () => {
      const rt = makeRuntime()
      const result = await rt.t("Hello", { to: "ru" })
      expect(result).toBe("[ru] Hello")
    })

    it("throws when not initialised", async () => {
      const rt = new PolyglotRuntime()
      await expect(rt.t("Hi", { to: "ru" })).rejects.toThrow("not initialised")
    })
  })

  describe("translate — array", () => {
    it("translates each string element preserving array shape", async () => {
      const rt = makeRuntime()
      const result = await rt.translate(["Hello", "World"], { to: "ru" })
      expect(result).toEqual(["[ru] Hello", "[ru] World"])
    })
  })

  describe("translate — nested object", () => {
    it("translates leaf string values and preserves structure", async () => {
      const rt = makeRuntime()
      const input = { greeting: "Hello", nested: { farewell: "Goodbye" } }
      const result = await rt.translate(input, { to: "ru" })
      expect(result.greeting).toBe("[ru] Hello")
      expect((result as typeof input).nested.farewell).toBe("[ru] Goodbye")
    })
  })

  describe("caching", () => {
    it("returns cached result on second call without calling provider again", async () => {
      const rt = makeRuntime()
      await rt.t("Cached text", { to: "ru" })
      await rt.t("Cached text", { to: "ru" })
      expect(shared.translateBatch).toHaveBeenCalledTimes(1)
    })

    it("bypasses cache when bypassCache is true", async () => {
      const rt = makeRuntime()
      await rt.t("Fresh", { to: "ru" })
      await rt.t("Fresh", { to: "ru", bypassCache: true })
      expect(shared.translateBatch).toHaveBeenCalledTimes(2)
    })

    it("clearCache clears all cached entries", async () => {
      const rt = makeRuntime()
      await rt.t("Clear me", { to: "ru" })
      rt.clearCache()
      await rt.t("Clear me", { to: "ru" })
      expect(shared.translateBatch).toHaveBeenCalledTimes(2)
    })
  })

  describe("Proxy Mode", () => {
    it("POSTs to the endpoint and returns the translation", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ translations: { __text: "[ru] Hello" } })
      })
      vi.stubGlobal("fetch", mockFetch)

      const rt = new PolyglotRuntime()
      rt.init({ provider: API_PROVIDER.GEMINI, endpoint: "/api/translate" })

      const result = await rt.t("Hello", { to: "ru" })
      expect(result).toBe("[ru] Hello")
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/translate",
        expect.objectContaining({ method: "POST" })
      )

      vi.unstubAllGlobals()
    })

    it("throws a descriptive error on non-ok response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 502,
          statusText: "Bad Gateway",
          text: async () => "upstream error"
        })
      )

      const rt = new PolyglotRuntime()
      rt.init({ provider: API_PROVIDER.GEMINI, endpoint: "/api/translate" })

      await expect(rt.t("Hi", { to: "ru" })).rejects.toThrow("Proxy endpoint error")
      vi.unstubAllGlobals()
    })
  })
})
