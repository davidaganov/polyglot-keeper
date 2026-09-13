import { describe, it, expect } from "vitest"
import { LRUCache, buildCacheKey } from "@/runtime/cache"

describe("LRUCache", () => {
  describe("get / set", () => {
    it("returns undefined for a missing key", () => {
      const cache = new LRUCache(10)
      expect(cache.get("missing")).toBeUndefined()
    })

    it("stores and retrieves a value", () => {
      const cache = new LRUCache(10)
      cache.set("k", "v")
      expect(cache.get("k")).toBe("v")
    })

    it("overwrites an existing key without increasing size", () => {
      const cache = new LRUCache(10)
      cache.set("k", "v1")
      cache.set("k", "v2")
      expect(cache.get("k")).toBe("v2")
      expect(cache.size).toBe(1)
    })
  })

  describe("LRU eviction", () => {
    it("evicts the least recently used entry when capacity is exceeded", () => {
      const cache = new LRUCache(3)
      cache.set("a", "1")
      cache.set("b", "2")
      cache.set("c", "3")
      // 'a' is the oldest — accessing 'b' and 'c' makes 'a' the LRU
      cache.set("d", "4") // should evict 'a'
      expect(cache.has("a")).toBe(false)
      expect(cache.has("b")).toBe(true)
      expect(cache.has("c")).toBe(true)
      expect(cache.has("d")).toBe(true)
    })

    it("refreshes position on get so recently read entries are not evicted first", () => {
      const cache = new LRUCache(3)
      cache.set("a", "1")
      cache.set("b", "2")
      cache.set("c", "3")
      cache.get("a") // 'a' is now most recently used; 'b' becomes oldest
      cache.set("d", "4") // should evict 'b'
      expect(cache.has("b")).toBe(false)
      expect(cache.has("a")).toBe(true)
    })
  })

  describe("clear", () => {
    it("empties the cache", () => {
      const cache = new LRUCache(10)
      cache.set("x", "y")
      cache.clear()
      expect(cache.size).toBe(0)
      expect(cache.has("x")).toBe(false)
    })
  })
})

describe("buildCacheKey", () => {
  it("returns a deterministic string", () => {
    const key = buildCacheKey("gemini", "gemini-flash-latest", "en", "ru", "hello")
    expect(key).toBe("gemini|gemini-flash-latest|en→ru|hello")
  })

  it("produces different keys for different target languages", () => {
    const a = buildCacheKey("gemini", "m", "en", "ru", "hi")
    const b = buildCacheKey("gemini", "m", "en", "de", "hi")
    expect(a).not.toBe(b)
  })
})
