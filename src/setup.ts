import fs from "node:fs/promises"
import path from "node:path"
import readline from "node:readline"
import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { ApiProvider, LocaleFormat, type UserConfig } from "./types.js"

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bgBlue: "\x1b[44m",
  white: "\x1b[37m"
} as const

const icon = {
  check: "✓",
  cross: "✗",
  bullet: "•",
  pointer: "▸",
  folder: "📁",
  file: "📄",
  sparkles: "✨",
  rocket: "🚀",
  key: "🔑",
  gear: "⚙️",
  diamond: "◆"
} as const

const clearScreen = (): void => {
  output.write("\x1b[2J\x1b[0f")
}

const titleBanner = (): string => {
  const lines = [
    "",
    `${c.cyan}════════════════════════════════════════${c.reset}`,
    `${c.cyan}${c.reset}           ${c.bold}${c.white}Polyglot Keeper ${c.reset}`,
    `${c.cyan}${c.reset}     ${c.gray}AI-Powered i18n Synchronization ${c.reset}`,
    `${c.cyan}════════════════════════════════════════${c.reset}`,
    ""
  ]
  return lines.join("\n")
}

const section = (title: string): void => {
  console.log(`\n${c.cyan}${c.bold}${icon.diamond} ${title}${c.reset}\n`)
}

const renderSelect = (
  title: string,
  options: readonly { label: string; hint?: string }[],
  activeIndex: number
): void => {
  clearScreen()
  console.log(titleBanner())
  console.log(`${c.cyan}${icon.pointer} ${c.bold}${title}${c.reset}\n`)

  for (let i = 0; i < options.length; i++) {
    const opt = options[i]
    const isActive = i === activeIndex
    const cursor = isActive ? `${c.cyan}${icon.pointer}${c.reset}` : " "
    const label = isActive
      ? `${c.bold}${c.white}${opt.label}${c.reset}`
      : `${c.white}${opt.label}${c.reset}`
    const hintText = opt.hint ? `  ${c.gray}${opt.hint}${c.reset}` : ""

    if (isActive) {
      console.log(`  ${cursor} ${c.bgBlue} ${label} ${c.reset}${hintText}`)
    } else {
      console.log(`  ${cursor} ${label}${hintText}`)
    }
  }

  console.log(`\n${c.gray}  Use ↑/↓ to navigate, Enter to confirm, Ctrl+C to cancel${c.reset}`)
}

const selectOne = async <T>(
  title: string,
  options: readonly { value: T; label: string; hint?: string }[],
  initialIndex = 0
): Promise<T | null> => {
  if (!input.isTTY) {
    return options[Math.max(0, Math.min(initialIndex, options.length - 1))]?.value ?? null
  }

  input.pause()
  readline.emitKeypressEvents(input)
  input.setRawMode(true)
  input.resume()

  let active = Math.max(0, Math.min(initialIndex, options.length - 1))
  renderSelect(title, options, active)

  return await new Promise<T | null>((resolve) => {
    const onKeyPress = (_: string, key: readline.Key) => {
      if (key.name === "up") {
        active = (active - 1 + options.length) % options.length
        renderSelect(title, options, active)
        return
      }
      if (key.name === "down") {
        active = (active + 1) % options.length
        renderSelect(title, options, active)
        return
      }
      if (key.name === "return") {
        cleanup()
        resolve(options[active]?.value ?? null)
        return
      }
      if (key.ctrl && key.name === "c") {
        cleanup()
        resolve(null)
        return
      }
      if (key.name === "escape") {
        cleanup()
        resolve(null)
      }
    }

    const cleanup = () => {
      input.off("keypress", onKeyPress)
      input.setRawMode(false)
      output.write("\n")
    }

    input.on("keypress", onKeyPress)
  })
}

const askText = async (message: string, initialValue: string): Promise<string | null> => {
  const rl = createInterface({ input, output })
  try {
    console.log()
    const prompt = `${c.cyan}${icon.pointer}${c.reset} ${c.bold}${message}${c.reset} ${c.gray}(default: ${initialValue})${c.reset}
${c.cyan}>${c.reset} `

    const answer = await rl.question(prompt)
    const trimmed = answer.trim()
    return trimmed.length > 0 ? trimmed : initialValue
  } catch {
    return null
  } finally {
    rl.close()
  }
}

const parseLocalesInput = (raw: string): string[] => {
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => p.toUpperCase())

  const uniq: string[] = []
  for (const p of parts) {
    if (!uniq.includes(p)) uniq.push(p)
  }
  return uniq
}

const generateConfigFile = (config: UserConfig): string => {
  return (
    JSON.stringify(
      {
        provider: config.provider,
        model: config.model,
        localeFormat: config.localeFormat,
        locales: config.locales,
        defaultLocale: config.defaultLocale,
        localesDir: config.localesDir,
        envFile: config.envFile || ".env",
        envVarName: config.envVarName || "POLYGLOT_API_KEY"
      },
      null,
      2
    ) + "\n"
  )
}

const generateEnvExample = (config: UserConfig): string => {
  const keyName = config.envVarName || "POLYGLOT_API_KEY"

  const apiKeyUrls: Record<ApiProvider, string> = {
    [ApiProvider.OPENAI]: "https://platform.openai.com/api-keys",
    [ApiProvider.GEMINI]: "https://aistudio.google.com/app/apikey",
    [ApiProvider.ANTHROPIC]: "https://console.anthropic.com/settings/keys"
  }

  return `# Polyglot Keeper - AI Translation Tool
# Get your API key from:
# - ${config.provider}: ${apiKeyUrls[config.provider]}

${keyName}=your_${config.provider}_api_key_here
`
}

const getDefaultModel = (provider: ApiProvider): string => {
  switch (provider) {
    case ApiProvider.GEMINI:
      return "gemini-2.5-flash"
    case ApiProvider.OPENAI:
      return "gpt-4o-mini"
    case ApiProvider.ANTHROPIC:
      return "claude-sonnet-4-5-20250929"
    default:
      return "gemini-2.5-flash"
  }
}

const getModelOptions = (provider: ApiProvider) => {
  switch (provider) {
    case ApiProvider.GEMINI:
      return [
        { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", hint: "Fast & cost-effective" },
        { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", hint: "Higher quality" },
        { value: "gemini-3-flash", label: "Gemini 3 Flash", hint: "Latest with reasoning" },
        { value: "gemini-3-pro", label: "Gemini 3 Pro", hint: "Most advanced" }
      ] as const
    case ApiProvider.OPENAI:
      return [
        { value: "gpt-4o-mini", label: "GPT-4o mini", hint: "Fast & affordable" },
        { value: "gpt-4o", label: "GPT-4o", hint: "Balanced performance" },
        { value: "gpt-4.1", label: "GPT-4.1", hint: "Advanced coding & long context" },
        { value: "gpt-5.2", label: "GPT-5.2", hint: "Best quality, higher cost" }
      ] as const
    case ApiProvider.ANTHROPIC:
      return [
        {
          value: "claude-sonnet-4-5-20250929",
          label: "Claude Sonnet 4.5",
          hint: "Balanced & efficient"
        },
        {
          value: "claude-haiku-4-5-20251001",
          label: "Claude Haiku 4.5",
          hint: "Fastest & most affordable"
        },
        { value: "claude-opus-4-5-20251101", label: "Claude Opus 4.5", hint: "Highest quality" },
        { value: "claude-opus-4-6", label: "Claude Opus 4.6", hint: "Latest flagship" }
      ] as const
    default:
      return [{ value: getDefaultModel(provider), label: "Default", hint: "" }] as const
  }
}

const exitWithError = (message: string): never => {
  console.log(`\n${c.red}${icon.cross} ${message}${c.reset}`)
  process.exit(1)
}

export const runSetupWizard = async (rootDir: string): Promise<UserConfig> => {
  clearScreen()
  console.log(titleBanner())

  section("AI Provider")

  const provider = await selectOne<ApiProvider>(
    "Choose your translation provider",
    [
      {
        value: ApiProvider.GEMINI,
        label: "Google Gemini",
        hint: "Free tier available, generous limits"
      },
      {
        value: ApiProvider.OPENAI,
        label: "OpenAI",
        hint: "Fast, high quality translations"
      },
      {
        value: ApiProvider.ANTHROPIC,
        label: "Anthropic Claude",
        hint: "Excellent for nuanced translations"
      }
    ] as const,
    0
  )

  if (!provider) {
    exitWithError("Setup cancelled")
  }

  section("Model")

  const modelOptions = getModelOptions(provider || ApiProvider.GEMINI)
  const selectedModel = await selectOne<string>("Choose the AI model", modelOptions, 0)

  if (!selectedModel) {
    exitWithError("Setup cancelled")
  }

  section("Locale Format")

  const localeFormat = await selectOne<LocaleFormat>(
    "How should locale files be named?",
    [
      {
        value: LocaleFormat.SHORT,
        label: "en.json, ru.json",
        hint: "Simple locale codes (recommended)"
      },
      {
        value: LocaleFormat.PAIR,
        label: "en-US.json, ru-RU.json",
        hint: "Full BCP 47 language tags"
      }
    ] as const,
    0
  )

  if (!localeFormat) {
    exitWithError("Setup cancelled")
  }

  section("Languages")

  const localesInput = await askText("Which languages do you support?", "en, ru")

  if (!localesInput) {
    exitWithError("Setup cancelled")
  }

  const locales = parseLocalesInput(localesInput || "")

  if (locales.length === 0) {
    exitWithError("No languages specified")
  }

  console.log(
    `  ${c.green}${icon.check}${c.reset} Configured languages: ${c.bold}${locales.join(", ")}${c.reset}`
  )

  section("Default Language")

  const defaultLocale = await selectOne<string>(
    "Which is your primary (source) language?",
    locales.map((l) => ({ value: l, label: l })),
    0
  )

  if (!defaultLocale) {
    exitWithError("Setup cancelled")
  }

  section("Paths & Environment")

  const localesDir = await askText("Where to store locale files?", "src/i18n")
  if (!localesDir) {
    exitWithError("Setup cancelled")
  }

  const envFile = await askText("Environment file name", ".env")
  if (!envFile) {
    exitWithError("Setup cancelled")
  }

  const envVarName = await askText("API key variable name", "POLYGLOT_API_KEY")
  if (!envVarName) {
    exitWithError("Setup cancelled")
  }

  // Create config
  const config: UserConfig = {
    provider: provider || ApiProvider.GEMINI,
    model: selectedModel || "",
    localeFormat: localeFormat || LocaleFormat.SHORT,
    locales,
    defaultLocale: defaultLocale || "",
    localesDir: localesDir || "",
    envFile: envFile || "",
    envVarName: envVarName!
  }

  // Ensure locales directory exists
  const fullLocalesDir = path.resolve(rootDir, localesDir || "src/i18n")
  await fs.mkdir(fullLocalesDir, { recursive: true })

  // Write config file
  const configContent = generateConfigFile(config)
  const configPath = path.join(rootDir, "polyglot.config.json")
  await fs.writeFile(configPath, configContent, "utf-8")

  // Write .env.example
  const envExamplePath = path.join(rootDir, ".env.example")
  const envExampleContent = generateEnvExample(config)
  await fs.writeFile(envExamplePath, envExampleContent, "utf-8")

  // Write .env file (with placeholder)
  const envPath = path.join(rootDir, envFile || ".env")
  const envPlaceholder = `${envVarName}=your_api_key_here\n`

  try {
    const existingContent = await fs.readFile(envPath, "utf-8")
    if (!existingContent.includes(`${envVarName}=`)) {
      await fs.appendFile(envPath, envPlaceholder, "utf-8")
    }
  } catch {
    await fs.writeFile(envPath, envPlaceholder, "utf-8")
  }

  // Summary
  clearScreen()
  console.log(titleBanner())
  console.log()
  console.log(`${c.green}${icon.sparkles} Setup complete!${c.reset}\n`)

  console.log(`${c.bold}Created files:${c.reset}`)
  console.log(
    `  ${c.green}${icon.check}${c.reset} ${c.bold}polyglot.config.json${c.reset} - Configuration`
  )
  console.log(
    `  ${c.green}${icon.check}${c.reset} ${c.bold}.env.example${c.reset} - API key template`
  )
  console.log(
    `  ${c.green}${icon.check}${c.reset} ${c.bold}${localesDir}/${c.reset} - Locales directory`
  )

  console.log()
  console.log(`${c.yellow}${icon.key}${c.reset} ${c.bold}Next steps:${c.reset}`)
  console.log()
  console.log(`  1. Add your API key to ${c.bold}${envFile}${c.reset}:`)
  console.log(`     ${c.gray}${envVarName}=${c.yellow}your_api_key_here${c.reset}`)
  console.log()
  console.log(
    `  2. Create ${c.bold}${defaultLocale?.toLowerCase()}.json${c.reset} in ${c.bold}${localesDir}/${c.reset}`
  )
  console.log(`     with your base translations`)
  console.log()
  console.log(
    `  3. Run ${c.cyan}${c.bold}npx polyglot-keeper sync${c.reset} to translate missing keys`
  )
  console.log()

  return config
}
