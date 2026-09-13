---
name: polyglot-keeper
description: >-
  Guide and best practices for integrating and using polyglot-keeper in web applications
  (Vue, React, Nuxt, Astro, Next.js, Node.js) and CLI workflows. Use this skill whenever
  the user asks to implement or configure i18n translations, add dynamic runtime translation,
  set up Direct Mode or Proxy Mode, create server translation handlers, or manage locale files.
---

# Polyglot Keeper Skill

Polyglot Keeper is a dual-mode internationalization (i18n) solution:

1. **CLI Mode**: Offline synchronization of static JSON and Markdown locale files using AI (Gemini, OpenAI, Anthropic).
2. **Runtime API**: Dynamic, on-the-fly translation of strings, arrays, and complex nested objects in web applications and backend services with in-memory caching.

---

## 1. Core Architecture Decision: Direct Mode vs Proxy Mode

When writing code that uses `polyglot-keeper/runtime`, **always** choose the correct architectural mode:

### Mode A: Direct Mode (Server-side / Node.js / SSR / CLI scripts)

- **Environment**: Node.js backend, SSR render (Nuxt server, Astro SSR, Next.js server actions), CLI scripts.
- **Security**: The API key is stored safely on the server (e.g. `process.env.GEMINI_API_KEY`).
- **Imports**:
  ```ts
  import { polyglot, API_PROVIDER } from "polyglot-keeper/runtime"
  // or: import { polyglot, API_PROVIDER } from "polyglot-keeper"
  ```
- **Initialization**:
  ```ts
  polyglot.init({
    provider: API_PROVIDER.GEMINI,
    apiKey: process.env.GEMINI_API_KEY!,
    defaultTargetLocale: "ru", // default target locale
    cache: true, // enabled by default
    cacheTTL: 1000 * 60 * 60 * 24 // optional TTL in ms (default: 24 hours)
  })
  ```

### Mode B: Proxy Mode (Browser / Client-Side SPA / Vue / React)

- **Environment**: Client-side browser bundle, SPA, mobile web.
- **CRITICAL SECURITY RULE**: **NEVER** put the AI `apiKey` in client-side code (`VITE_*`, `NUXT_PUBLIC_*`, or hardcoded). The API key must remain strictly on the backend.
- **Client Imports**:
  ```ts
  import { polyglot } from "polyglot-keeper/runtime"
  ```
- **Client Initialization**:
  ```ts
  polyglot.init({
    endpoint: "/api/translate", // backend proxy endpoint
    defaultTargetLocale: "ru"
  })
  ```
- **Server Handler (`createTranslateHandler`)**:
  Create a backend endpoint that acts as the proxy bridge using `createTranslateHandler`:

  **Nuxt 3** (`server/api/translate.post.ts`):

  ```ts
  import { createTranslateHandler, API_PROVIDER } from "polyglot-keeper/runtime"

  const handler = createTranslateHandler({
    provider: API_PROVIDER.GEMINI,
    apiKey: process.env.GEMINI_API_KEY!
  })

  export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    return handler(body)
  })
  ```

  **Astro** (`src/pages/api/translate.ts`):

  ```ts
  import type { APIRoute } from "astro"
  import { createTranslateHandler, API_PROVIDER } from "polyglot-keeper/runtime"

  const handler = createTranslateHandler({
    provider: API_PROVIDER.GEMINI,
    apiKey: import.meta.env.GEMINI_API_KEY
  })

  export const POST: APIRoute = async ({ request }) => {
    const body = await request.json()
    const result = await handler(body)
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" }
    })
  }
  ```

---

## 2. Runtime API Usage Patterns

### 2.1 Single String: `polyglot.t()`

Translates a single string into the target locale.

```ts
// Using defaultTargetLocale configured during init:
const greeting = await polyglot.t("Hello, how are you?")

// Or specifying target locale explicitly:
const greetingRu = await polyglot.t("Hello, how are you?", { to: "ru" })
```

### 2.2 Array of Strings: `polyglot.translate()`

Translates multiple strings in a single batch call.

```ts
const tags = await polyglot.translate(["Technology", "Design", "Business"], { to: "ru" })
// → ["Технологии", "Дизайн", "Бизнес"]
```

### 2.3 Nested Objects (Type-Safe): `polyglot.translate()`

Recursively traverses all string values while keeping object keys, numbers, booleans, and TypeScript structure identical.

```ts
interface Product {
  name: string
  description: string
  meta: { views: number; tags: string[] }
}

const product: Product = {
  name: "Wireless Headphones",
  description: "High quality wireless audio.",
  meta: { views: 1500, tags: ["audio", "gadgets"] }
}

const translated = await polyglot.translate(product, { to: "ru" })
// TypeScript type is preserved: typeof translated === Product
```

### 2.4 Cache Management

`polyglot-keeper` contains an automatic in-memory LRU cache.

- To inspect or clear cache:
  ```ts
  polyglot.clearCache()
  ```
- Cached entries return in 0ms without hitting the AI provider or the proxy endpoint.

---

## 3. Vue 3 Integration Pattern

Follow project architecture standards when creating Vue components or composables:

### 3.1 App Initialization (e.g. `main.ts` or Nuxt plugin)

```ts
// plugins/polyglot.client.ts (or main.ts)
import { polyglot } from "polyglot-keeper/runtime"

polyglot.init({
  endpoint: "/api/translate",
  defaultTargetLocale: "ru"
})
```

### 3.2 Composable Pattern (`usePolyglotTranslate.ts`)

```ts
import { ref } from "vue"
import { polyglot } from "polyglot-keeper/runtime"
import type { TranslatableInput, TranslateOptions } from "polyglot-keeper/runtime"

export const usePolyglotTranslate = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const translate = async <T extends TranslatableInput>(
    input: T,
    options?: TranslateOptions
  ): Promise<T> => {
    isLoading.value = true
    error.value = null
    try {
      return await polyglot.translate(input, options)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : "Translation failed"
      return input // Graceful fallback to original content
    } finally {
      isLoading.value = false
    }
  }

  return {
    translate,
    isLoading,
    error
  }
}
```

---

## 4. CLI Mode Reference (Static Locale Sync)

For offline translation of locale files:

### CLI Commands:

```bash
# Interactive setup:
npx polyglot-keeper init

# Sync JSON locales (src/i18n/*.json):
npx polyglot-keeper sync

# Sync Markdown files (content/**/*.md):
npx polyglot-keeper sync --md

# Force re-translation of all keys:
npx polyglot-keeper sync --force
```

### Configuration (`polyglot.config.json`):

```json
{
  "envFile": ".env",
  "json": {
    "provider": "gemini",
    "model": "gemini-flash-latest",
    "localeFormat": "short",
    "locales": ["EN", "RU", "DE"],
    "defaultLocale": "EN",
    "localesDir": "src/i18n",
    "trackChanges": "carefully"
  },
  "markdown": {
    "provider": "gemini",
    "model": "gemini-flash-latest",
    "contentDir": "content",
    "defaultLocale": "en",
    "locales": ["en", "ru"],
    "trackChanges": "carefully"
  }
}
```

---

## 5. Anti-Patterns to Avoid

- ❌ **Do NOT expose `apiKey` in browser code.** Always use Proxy Mode (`endpoint: "/api/translate"`) in frontends.
- ❌ **Do NOT import from `polyglot-keeper` in pure client code.** In client SPA bundles, import strictly from `polyglot-keeper/runtime` to avoid bundling CLI/Node-specific dependencies.
- ❌ **Do NOT bypass type preservation.** `polyglot.translate<T>(data)` preserves `T`. Avoid unneeded `as any` casts.
- ❌ **Do NOT call `polyglot.init()` inside render loops or component setups repeatedly.** Call it once during application bootstrap (e.g. entry point, root plugin).
