import http from "node:http"
import fs from "node:fs/promises"
import path from "node:path"
import { LOCALE_FORMAT, type UserConfig, type JSONObject } from "@/interfaces"
import { GeminiProvider, OpenAIProvider, AnthropicProvider } from "@/providers"
import { setNestedValue, deleteNestedKey } from "@/utils"
import { getHtml } from "@/ui/html"

interface ServeOptions {
  rootDir: string
  config: UserConfig
  port: number
}

// ─── Locale file helpers ──────────────────────────────────────────────────────

const getLocaleFileName = (localeCode: string, format: LOCALE_FORMAT): string => {
  if (format === LOCALE_FORMAT.PAIR) {
    return `${localeCode}-${localeCode.toLowerCase()}.json`
  }
  return `${localeCode.toLowerCase()}.json`
}

const getLocalePath = (
  rootDir: string,
  localesDir: string,
  localeCode: string,
  format: LOCALE_FORMAT
): string => path.join(rootDir, localesDir, getLocaleFileName(localeCode, format))

const readLocaleFile = async (filePath: string): Promise<JSONObject> => {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    return JSON.parse(content) as JSONObject
  } catch {
    return {}
  }
}

const flattenLocale = (obj: JSONObject, prefix = ""): Record<string, string> => {
  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (val && typeof val === "object" && !Array.isArray(val)) {
      Object.assign(result, flattenLocale(val as JSONObject, fullKey))
    } else if (typeof val === "string") {
      result[fullKey] = val
    }
  }
  return result
}

const buildNestedObject = (flat: Record<string, string>): JSONObject => {
  const result: JSONObject = {}
  for (const [key, value] of Object.entries(flat)) {
    setNestedValue(result, key, value)
  }
  return result
}

const clearValues = (obj: JSONObject): JSONObject => {
  const result: JSONObject = {}
  for (const [key, val] of Object.entries(obj)) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      result[key] = clearValues(val as JSONObject)
    } else {
      result[key] = ""
    }
  }
  return result
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

const readBody = (req: http.IncomingMessage): Promise<unknown> =>
  new Promise((resolve, reject) => {
    let body = ""
    req.on("data", (chunk) => (body += chunk))
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"))
      } catch {
        resolve({})
      }
    })
    req.on("error", reject)
  })

const send = (res: http.ServerResponse, data: unknown, status = 200) => {
  const json = JSON.stringify(data)
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  })
  res.end(json)
}

const sendError = (res: http.ServerResponse, message: string, status = 400) => {
  return send(res, { error: message }, status)
}

// ─── Server ───────────────────────────────────────────────────────────────────

export const startServeServer = async (options: ServeOptions): Promise<http.Server> => {
  const { rootDir, config, port } = options
  const jsonConfig = config.json!

  const getKeyCount = (): number => {
    const envVarName = jsonConfig.envVarName ?? "POLYGLOT_API_KEY"
    const rawKey = process.env[envVarName]
    if (!rawKey) return 0
    return rawKey
      .split(/[,;\n]+/)
      .map((k) => k.trim())
      .filter(Boolean).length
  }

  const getProvider = () => {
    const providerKey = jsonConfig.provider ?? "gemini"
    const model = jsonConfig.model ?? "gemini-flash-latest"
    const envVarName = jsonConfig.envVarName ?? "POLYGLOT_API_KEY"
    const apiKey = process.env[envVarName]
    if (!apiKey) throw new Error(`API key not found. Set ${envVarName} in your .env file.`)

    switch (providerKey) {
      case "openai":
        return new OpenAIProvider(apiKey, model)
      case "anthropic":
        return new AnthropicProvider(apiKey, model)
      default:
        return new GeminiProvider(apiKey, model)
    }
  }

  const getAllLocaleData = async () => {
    const locales: Record<string, Record<string, string>> = {}
    for (const locale of jsonConfig.locales) {
      const filePath = getLocalePath(
        rootDir,
        jsonConfig.localesDir,
        locale,
        jsonConfig.localeFormat
      )
      const raw = await readLocaleFile(filePath)
      locales[locale.toLowerCase()] = flattenLocale(raw)
    }
    return locales
  }

  const configFilePath = path.join(rootDir, "polyglot.config.json")

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`)
    const pathname = url.pathname
    const method = req.method ?? "GET"

    if (method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      })
      res.end()
      return
    }

    try {
      if (method === "GET" && pathname === "/") {
        const html = getHtml()
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        })
        res.end(html)
        return
      }

      // ── GET /favicon.ico — prevent 404
      if (method === "GET" && pathname === "/favicon.ico") {
        res.writeHead(204)
        res.end()
        return
      }

      // ── GET /api/data — config + all locale data
      if (method === "GET" && pathname === "/api/data") {
        const locales = await getAllLocaleData()
        send(res, {
          config: { json: jsonConfig },
          locales,
          sourceLocale: jsonConfig.defaultLocale.toLowerCase(),
          allLocales: jsonConfig.locales.map((l) => l.toLowerCase()),
          keyCount: getKeyCount(),
          providerName: jsonConfig.provider ?? "gemini",
          modelName: jsonConfig.model ?? "gemini-flash-latest"
        })
        return
      }

      // ── POST /api/translate — AI translation
      if (method === "POST" && pathname === "/api/translate") {
        const body = (await readBody(req)) as { batch: Record<string, string>; targetLang: string }
        if (!body.batch || !body.targetLang) {
          sendError(res, "Missing batch or targetLang")
          return
        }
        const provider = getProvider()
        const translations = await provider.translateBatch(body.batch, body.targetLang)
        send(res, { translations })
        return
      }

      // ── POST /api/save — write locale JSON to disk
      if (method === "POST" && pathname === "/api/save") {
        const body = (await readBody(req)) as { locale: string; data: Record<string, string> }
        if (!body.locale || !body.data) {
          sendError(res, "Missing locale or data")
          return
        }
        const nested = buildNestedObject(body.data)
        const filePath = getLocalePath(
          rootDir,
          jsonConfig.localesDir,
          body.locale.toUpperCase(),
          jsonConfig.localeFormat
        )
        await fs.writeFile(filePath, JSON.stringify(nested, null, 2) + "\n", "utf-8")
        send(res, { ok: true })
        return
      }

      // ── POST /api/locales — add new locale
      if (method === "POST" && pathname === "/api/locales") {
        const body = (await readBody(req)) as { locale: string }
        const localeCode = body.locale.toUpperCase()

        if (jsonConfig.locales.map((l) => l.toUpperCase()).includes(localeCode)) {
          sendError(res, `Locale ${localeCode} already exists`)
          return
        }

        const sourceFilePath = getLocalePath(
          rootDir,
          jsonConfig.localesDir,
          jsonConfig.defaultLocale,
          jsonConfig.localeFormat
        )
        const sourceData = await readLocaleFile(sourceFilePath)
        const emptyData = JSON.stringify(clearValues(sourceData), null, 2) + "\n"

        const newFilePath = getLocalePath(
          rootDir,
          jsonConfig.localesDir,
          localeCode,
          jsonConfig.localeFormat
        )

        await fs.writeFile(newFilePath, emptyData, "utf-8")

        const rawConfig = JSON.parse(await fs.readFile(configFilePath, "utf-8"))
        rawConfig.json.locales.push(localeCode)
        await fs.writeFile(configFilePath, JSON.stringify(rawConfig, null, 2) + "\n", "utf-8")

        jsonConfig.locales.push(localeCode)

        send(res, { ok: true, locale: body.locale.toLowerCase() })
        return
      }

      // ── DELETE /api/locales — remove a locale
      if (method === "DELETE" && pathname === "/api/locales") {
        const body = (await readBody(req)) as { locale: string }
        const localeCode = body.locale.toUpperCase()

        if (localeCode === jsonConfig.defaultLocale.toUpperCase()) {
          sendError(res, "Cannot delete the source locale")
          return
        }

        const filePath = getLocalePath(
          rootDir,
          jsonConfig.localesDir,
          localeCode,
          jsonConfig.localeFormat
        )
        await fs.unlink(filePath).catch(() => {})

        const rawConfig = JSON.parse(await fs.readFile(configFilePath, "utf-8"))
        rawConfig.json.locales = rawConfig.json.locales.filter(
          (l: string) => l.toUpperCase() !== localeCode
        )
        await fs.writeFile(configFilePath, JSON.stringify(rawConfig, null, 2) + "\n", "utf-8")

        jsonConfig.locales = jsonConfig.locales.filter((l) => l.toUpperCase() !== localeCode)

        send(res, { ok: true })
        return
      }

      // ── POST /api/default-locale — set source/default locale
      if (method === "POST" && pathname === "/api/default-locale") {
        const body = (await readBody(req)) as { locale: string }
        const localeCode = body.locale.toUpperCase()

        if (!jsonConfig.locales.map((l) => l.toUpperCase()).includes(localeCode)) {
          sendError(res, `Locale ${localeCode} is not in configured locales`)
          return
        }

        const rawConfig = JSON.parse(await fs.readFile(configFilePath, "utf-8"))
        rawConfig.json.defaultLocale = localeCode
        await fs.writeFile(configFilePath, JSON.stringify(rawConfig, null, 2) + "\n", "utf-8")

        jsonConfig.defaultLocale = localeCode

        send(res, { ok: true, defaultLocale: localeCode.toLowerCase() })
        return
      }

      // ── POST /api/keys — add key to source locale
      if (method === "POST" && pathname === "/api/keys") {
        const body = (await readBody(req)) as { key: string; value: string }
        if (!body.key) {
          sendError(res, "Missing key")
          return
        }
        const sourceFilePath = getLocalePath(
          rootDir,
          jsonConfig.localesDir,
          jsonConfig.defaultLocale,
          jsonConfig.localeFormat
        )
        const sourceData = await readLocaleFile(sourceFilePath)
        setNestedValue(sourceData, body.key, body.value ?? "")
        await fs.writeFile(sourceFilePath, JSON.stringify(sourceData, null, 2) + "\n", "utf-8")
        send(res, { ok: true })
        return
      }

      // ── DELETE /api/keys — delete key from all locales
      if (method === "DELETE" && pathname === "/api/keys") {
        const body = (await readBody(req)) as { key: string }
        if (!body.key) {
          sendError(res, "Missing key")
          return
        }
        for (const locale of jsonConfig.locales) {
          const filePath = getLocalePath(
            rootDir,
            jsonConfig.localesDir,
            locale,
            jsonConfig.localeFormat
          )
          const data = await readLocaleFile(filePath)
          deleteNestedKey(data, body.key)
          await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8")
        }
        send(res, { ok: true })
        return
      }

      send(res, { error: "Not found" }, 404)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      sendError(res, message, 500)
    }
  })

  return new Promise((resolve, reject) => {
    server.on("error", reject)
    server.listen(port, "localhost", () => resolve(server))
  })
}
