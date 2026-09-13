/**
 * Minimal in-memory LRU cache for translation results.
 *
 * Uses a Map (which preserves insertion order) as the underlying store.
 * When the capacity is exceeded the oldest entry is evicted.
 */
export class LRUCache {
  private readonly store: Map<string, string>
  private readonly maxSize: number

  constructor(maxSize: number) {
    this.maxSize = maxSize
    this.store = new Map()
  }

  get(key: string): string | undefined {
    const value = this.store.get(key)
    if (value === undefined) return undefined

    // Refresh position — delete and re-insert so this entry becomes newest
    this.store.delete(key)
    this.store.set(key, value)
    return value
  }

  set(key: string, value: string): void {
    if (this.store.has(key)) {
      this.store.delete(key)
    } else if (this.store.size >= this.maxSize) {
      // Evict the oldest (first) entry
      const oldest = this.store.keys().next().value
      if (oldest !== undefined) {
        this.store.delete(oldest)
      }
    }
    this.store.set(key, value)
  }

  has(key: string): boolean {
    return this.store.has(key)
  }

  clear(): void {
    this.store.clear()
  }

  get size(): number {
    return this.store.size
  }
}

/**
 * Builds a deterministic cache key from the translation parameters.
 */
export const buildCacheKey = (
  provider: string,
  model: string,
  sourceLang: string,
  targetLang: string,
  payload: string
): string => `${provider}|${model}|${sourceLang}→${targetLang}|${payload}`
