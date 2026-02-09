import { describe, it, expect, vi } from "vitest"
import fs from "node:fs/promises"
import {
  extractKeys,
  getNestedValue,
  setNestedValue,
  deleteNestedKey,
  fileExists,
  reorderToMatchSource,
  removeObsoleteKeys,
  buildTranslationPrompt,
  parseApiResponse
} from "@/utils"

// Mock fs
vi.mock("node:fs/promises")

describe("Utils", () => {
  describe("extractKeys", () => {
    it("should extract keys from simple object", () => {
      const obj = { a: 1, b: 2 }
      expect(extractKeys(obj)).toEqual(["a", "b"])
    })

    it("should extract nested keys", () => {
      const obj = { a: { b: 1 }, c: 2 }
      expect(extractKeys(obj)).toEqual(["a.b", "c"])
    })
  })

  describe("getNestedValue", () => {
    const obj = { a: { b: "value" }, c: "top" }

    it("should get existing nested value", () => {
      expect(getNestedValue(obj, "a.b")).toBe("value")
    })

    it("should return undefined for missing key", () => {
      expect(getNestedValue(obj, "a.c")).toBeUndefined()
    })

    it("should return undefined if path is broken", () => {
      expect(getNestedValue(obj, "x.y")).toBeUndefined()
    })
  })

  describe("setNestedValue", () => {
    it("should set nested value", () => {
      const obj: any = {}
      setNestedValue(obj, "a.b", "value")
      expect(obj).toEqual({ a: { b: "value" } })
    })

    it("should set top level value", () => {
      const obj: any = {}
      setNestedValue(obj, "a", "value")
      expect(obj).toEqual({ a: "value" })
    })
  })

  describe("deleteNestedKey", () => {
    it("should delete nested key", () => {
      const obj = { a: { b: 1, c: 2 } }
      deleteNestedKey(obj, "a.b")
      expect(obj).toEqual({ a: { c: 2 } })
    })

    it("should cleanup empty objects", () => {
      const obj = { a: { b: 1 } }
      deleteNestedKey(obj, "a.b")
      expect(obj).toEqual({})
    })
  })

  describe("fileExists", () => {
    it("should return true if file exists", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      expect(await fileExists("test.txt")).toBe(true)
    })

    it("should return false if file does not exist", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"))
      expect(await fileExists("test.txt")).toBe(false)
    })
  })

  describe("reorderToMatchSource", () => {
    it("should reorder keys to match source", () => {
      const source = { a: 1, b: 2 }
      const target = { b: 2, a: 1 }
      const result = reorderToMatchSource(source, target)
      expect(Object.keys(result)).toEqual(["a", "b"])
    })

    it("should handle nested objects", () => {
      const source = { a: { x: 1, y: 2 } }
      const target = { a: { y: 2, x: 1 } }
      const result = reorderToMatchSource(source, target) as any
      expect(Object.keys(result.a)).toEqual(["x", "y"])
    })
  })

  describe("removeObsoleteKeys", () => {
    it("should remove keys not in source", () => {
      const target = { a: 1, b: 2, c: 3 }
      const sourceKeys = ["a", "b"]
      const removed = removeObsoleteKeys(target, sourceKeys)
      expect(removed).toBe(1)
      expect(target).toEqual({ a: 1, b: 2 })
    })
  })

  describe("buildTranslationPrompt", () => {
    it("should replace placeholders", () => {
      const batch = { key: "value" }
      const prompt = buildTranslationPrompt(batch, "ru")
      expect(prompt).toContain('code "ru"')
      expect(prompt).toContain('"key": "value"')
    })
  })

  describe("parseApiResponse", () => {
    it("should parse valid JSON", () => {
      const json = '{"key": "value"}'
      expect(parseApiResponse(json)).toEqual({ key: "value" })
    })

    it("should parse JSON in markdown code block", () => {
      const json = '```json\n{"key": "value"}\n```'
      expect(parseApiResponse(json)).toEqual({ key: "value" })
    })

    it("should throw on invalid JSON", () => {
      expect(() => parseApiResponse("invalid")).toThrow()
    })
  })
})
