/**
 * Utility for managing and rotating multiple API keys with automatic failover
 * on rate limits (429) or temporary server unavailability (503).
 */
export class KeyRotator {
  private keys: string[]
  private currentIndex = 0

  /**
   * Creates a KeyRotator instance.
   * @param apiKeys A single key, a comma/semicolon/newline-separated string of keys, or an array of keys.
   */
  constructor(apiKeys: string | string[]) {
    if (Array.isArray(apiKeys)) {
      this.keys = apiKeys
        .flatMap((k) => (typeof k === "string" ? k.split(/[,;\n]+/) : []))
        .map((k) => k.trim())
        .filter(Boolean)
    } else if (typeof apiKeys === "string") {
      this.keys = apiKeys
        .split(/[,;\n]+/)
        .map((k) => k.trim())
        .filter(Boolean)
    } else {
      this.keys = []
    }

    if (this.keys.length === 0) {
      throw new Error("No valid API key provided.")
    }
  }

  /**
   * Total number of configured keys.
   */
  get count(): number {
    return this.keys.length
  }

  /**
   * Copy of all active keys.
   */
  get allKeys(): string[] {
    return [...this.keys]
  }

  /**
   * Current 0-based key index.
   */
  get activeIndex(): number {
    return this.currentIndex
  }

  /**
   * Returns the currently active key.
   */
  getKey(): string {
    return this.keys[this.currentIndex]
  }

  /**
   * Advances to the next key in round-robin fashion.
   * @returns The newly active key.
   */
  rotate(): string {
    this.currentIndex = (this.currentIndex + 1) % this.keys.length
    return this.getKey()
  }

  /**
   * Checks whether an error is a transient rate-limit or availability error that warrants key rotation.
   */
  static isRateLimitOrTransientError(err: unknown): boolean {
    if (!err) return false
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
    return (
      msg.includes("429") ||
      msg.includes("503") ||
      msg.includes("quota") ||
      msg.includes("rate limit") ||
      msg.includes("rate_limit") ||
      msg.includes("resource_exhausted") ||
      msg.includes("high demand") ||
      msg.includes("temporarily unavailable") ||
      msg.includes("overloaded")
    )
  }

  /**
   * Executes an async operation with the current key.
   * If the operation throws a rate-limit/transient error and multiple keys exist,
   * it rotates to the next key and retries (up to the total number of keys).
   * On success, rotates to the next key to distribute load (round-robin).
   */
  async executeWithRetry<T>(
    fn: (key: string) => Promise<T>,
    customIsRetryable?: (err: unknown) => boolean
  ): Promise<T> {
    const isRetryable = customIsRetryable ?? KeyRotator.isRateLimitOrTransientError
    const maxAttempts = this.keys.length
    let lastError: unknown

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const key = this.getKey()
      try {
        const result = await fn(key)
        // Advance round-robin for subsequent calls
        if (this.keys.length > 1) {
          this.rotate()
        }
        return result
      } catch (err: unknown) {
        lastError = err
        if (isRetryable(err) && attempt < maxAttempts - 1) {
          this.rotate()
          continue
        }
        throw err
      }
    }

    throw lastError
  }
}
