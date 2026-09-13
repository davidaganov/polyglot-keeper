import path from "node:path"
import { exec } from "node:child_process"
import dotenv from "dotenv"
import { loadConfig, mergeWithDefaults } from "@/config-loader"
import { startServeServer } from "@/ui/server"

const DEFAULT_PORT = 3636

export interface ServeOptions {
  rootDir: string
  port?: number
}

const openBrowser = (url: string) => {
  const cmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`

  exec(cmd)
}

export const serve = async (options: ServeOptions): Promise<void> => {
  const { rootDir, port = DEFAULT_PORT } = options
  const rawConfig = await loadConfig(rootDir)

  if (!rawConfig?.json) {
    console.error("\n❌  No JSON locale config found in polyglot.config.json")
    console.error("   Run: npx polyglot-keeper init\n")
    process.exit(1)
  }

  const config = mergeWithDefaults(rawConfig)

  const envPath = path.join(rootDir, config.envFile ?? ".env")
  dotenv.config({ path: envPath })

  try {
    await startServeServer({ rootDir, config, port })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes("EADDRINUSE")) {
      console.error(`\n❌  Port ${port} is already in use. Try a different port.\n`)
    } else {
      console.error(`\n❌  Failed to start server: ${message}\n`)
    }
    process.exit(1)
  }

  const url = `http://localhost:${port}`

  console.log("\n")
  console.log("🌐  Polyglot Keeper — Locale Editor")
  console.log("───────────────────────────────────")
  console.log(`${url}`)

  openBrowser(url)

  process.on("SIGINT", () => {
    console.log("\n  👋  Stopped\n")
    process.exit(0)
  })
}
