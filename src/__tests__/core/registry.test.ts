import { describe, it, expect } from "vitest"
import { registerProvider, getProvider } from "@/core/registry"
import { TranslationProvider, TranslationBatch } from "@/interfaces"

class MockProvider implements TranslationProvider {
  name = "Mock"
  constructor(
    public apiKey: string,
    public model: string
  ) {}
  async translateBatch(batch: TranslationBatch): Promise<TranslationBatch> {
    return batch
  }
}

describe("Registry", () => {
  it("should register and retrieve a provider", () => {
    registerProvider("mock", MockProvider)
    const provider = getProvider("mock", "key", "model")
    expect(provider).toBeInstanceOf(MockProvider)
    expect((provider as MockProvider).apiKey).toBe("key")
    expect((provider as MockProvider).model).toBe("model")
  })

  it("should throw error for unknown provider", () => {
    expect(() => getProvider("unknown", "key", "model")).toThrow(/Provider unknown not found/)
  })
})
