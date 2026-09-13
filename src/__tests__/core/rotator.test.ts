import { describe, it, expect, vi } from "vitest"
import { KeyRotator } from "@/core/rotator"

describe("KeyRotator", () => {
  it("should parse single string key", () => {
    const rotator = new KeyRotator("key1")
    expect(rotator.count).toBe(1)
    expect(rotator.getKey()).toBe("key1")
  })

  it("should parse comma and semicolon separated keys", () => {
    const rotator = new KeyRotator("key1, key2; key3\nkey4")
    expect(rotator.count).toBe(4)
    expect(rotator.allKeys).toEqual(["key1", "key2", "key3", "key4"])
  })

  it("should parse array of keys", () => {
    const rotator = new KeyRotator(["key1", "key2, key3"])
    expect(rotator.count).toBe(3)
    expect(rotator.allKeys).toEqual(["key1", "key2", "key3"])
  })

  it("should throw if empty or whitespace keys", () => {
    expect(() => new KeyRotator("  ")).toThrow(/No valid API key/)
    expect(() => new KeyRotator([])).toThrow(/No valid API key/)
  })

  it("should rotate through keys in round-robin order", () => {
    const rotator = new KeyRotator("k1, k2, k3")
    expect(rotator.getKey()).toBe("k1")
    expect(rotator.rotate()).toBe("k2")
    expect(rotator.rotate()).toBe("k3")
    expect(rotator.rotate()).toBe("k1")
  })

  describe("executeWithRetry", () => {
    it("should execute fn with active key and advance round-robin on success", async () => {
      const rotator = new KeyRotator("k1, k2")
      const fn = vi.fn().mockResolvedValue("result")

      const res = await rotator.executeWithRetry(fn)
      expect(res).toBe("result")
      expect(fn).toHaveBeenCalledWith("k1")
      expect(rotator.getKey()).toBe("k2")
    })

    it("should automatically retry with next key on 429 rate limit error", async () => {
      const rotator = new KeyRotator("key_limited, key_healthy")
      const fn = vi.fn().mockImplementation((key: string) => {
        if (key === "key_limited") {
          throw new Error("Gemini API error: 429 - RESOURCE_EXHAUSTED")
        }
        return Promise.resolve("translated")
      })

      const res = await rotator.executeWithRetry(fn)
      expect(res).toBe("translated")
      expect(fn).toHaveBeenCalledTimes(2)
      expect(fn).toHaveBeenNthCalledWith(1, "key_limited")
      expect(fn).toHaveBeenNthCalledWith(2, "key_healthy")
    })

    it("should throw if all keys hit rate limits", async () => {
      const rotator = new KeyRotator("k1, k2")
      const fn = vi.fn().mockRejectedValue(new Error("429 rate limit exceeded"))

      await expect(rotator.executeWithRetry(fn)).rejects.toThrow(/429 rate limit/)
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it("should not retry on non-retryable errors (e.g. 400 Bad Request)", async () => {
      const rotator = new KeyRotator("k1, k2")
      const fn = vi.fn().mockRejectedValue(new Error("400 Bad Request: Invalid model"))

      await expect(rotator.executeWithRetry(fn)).rejects.toThrow(/400 Bad Request/)
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })
})
