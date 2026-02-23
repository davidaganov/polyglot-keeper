import fs from "node:fs/promises"
import path from "node:path"
import { TRACK_CHANGES, type UserConfig } from "@/interfaces"
import { clearScreen, titleBanner, section, selectOne, exitWithError } from "@/setup/ui"
import { generateConfigFile } from "@/setup/config-writer"
import { setupJsonSection } from "@/setup/json-setup"
import { setupMdSection } from "@/setup/md-setup"
import { c, icon } from "@/utils/styles"

/** Translation mode for setup wizard. */
type TranslationMode = "json" | "markdown" | "both"

/**
 * Runs the interactive setup wizard.
 * @param rootDir - Project root directory.
 * @returns User configuration object.
 */
export const runSetupWizard = async (rootDir: string): Promise<UserConfig> => {
  clearScreen()
  console.log(titleBanner())

  section("Translation Mode")

  const mode = await selectOne<TranslationMode>(
    "What would you like to translate?",
    [
      { value: "both", label: "JSON + Markdown", hint: "Locale files and markdown content" },
      { value: "json", label: "JSON locale files", hint: "Standard i18n key-value translations" },
      { value: "markdown", label: "Markdown files", hint: "Content files like docs or blog posts" }
    ] as const,
    0
  )
  if (!mode) exitWithError("Setup cancelled")

  const needsJson = mode === "json" || mode === "both"
  const needsMd = mode === "markdown" || mode === "both"

  const configPath = path.join(rootDir, "polyglot.config.json")
  let existingConfig: UserConfig | null = null
  try {
    const raw = await fs.readFile(configPath, "utf-8")
    existingConfig = JSON.parse(raw) as UserConfig
  } catch {
    existingConfig = null
  }

  const jsonConfig = needsJson ? await setupJsonSection() : null
  if (needsJson && !jsonConfig) exitWithError("Setup cancelled")

  if (mode === "both") {
    console.log()
    console.log(`${c.cyan}${icon.sparkles} Now setting up Markdown translation...${c.reset}`)
    console.log()
  }

  const markdownConfig = needsMd
    ? await setupMdSection(
        jsonConfig?.locales,
        jsonConfig?.defaultLocale,
        mode === "both",
        jsonConfig?.provider,
        jsonConfig?.model,
        jsonConfig?.envVarName
      )
    : null
  if (needsMd && !markdownConfig) exitWithError("Setup cancelled")

  const config: UserConfig = {
    ...existingConfig,
    envFile: existingConfig?.envFile || ".env"
  }
  if (jsonConfig) config.json = jsonConfig
  if (markdownConfig) config.markdown = markdownConfig

  if (jsonConfig) {
    const fullLocalesDir = path.resolve(rootDir, jsonConfig.localesDir)
    await fs.mkdir(fullLocalesDir, { recursive: true })
  }

  if (markdownConfig) {
    const contentPath = path.resolve(rootDir, markdownConfig.contentDir)
    const sourcePath = path.join(contentPath, markdownConfig.defaultLocale)
    await fs.mkdir(sourcePath, { recursive: true })
    for (const locale of markdownConfig.locales) {
      await fs.mkdir(path.join(contentPath, locale), { recursive: true })
    }
  }

  const configContent = generateConfigFile(config)
  const configFilePath = path.join(rootDir, "polyglot.config.json")
  await fs.writeFile(configFilePath, configContent, "utf-8")

  const envPath = path.join(rootDir, ".env")
  const envVars = new Set<string>()
  if (config.json?.envVarName) envVars.add(config.json.envVarName)
  if (config.markdown?.envVarName) envVars.add(config.markdown.envVarName)
  if (envVars.size === 0) envVars.add("POLYGLOT_API_KEY")

  const envPlaceholder =
    Array.from(envVars)
      .map((envName) => `${envName}=your_api_key_here`)
      .join("\n") + "\n"

  try {
    const existingContent = await fs.readFile(envPath, "utf-8")
    let needsUpdate = false

    for (const envName of envVars) {
      if (!existingContent.includes(`${envName}=`)) {
        needsUpdate = true
        break
      }
    }

    if (needsUpdate) {
      await fs.appendFile(envPath, envPlaceholder, "utf-8")
    }
  } catch {
    await fs.writeFile(envPath, envPlaceholder, "utf-8")
  }

  clearScreen()
  console.log(titleBanner())
  console.log()
  console.log(`${c.green}${icon.sparkles} Setup complete!${c.reset}\n`)

  console.log(`${c.bold}Created files:${c.reset}`)
  console.log(
    `  ${c.green}${icon.check}${c.reset} ${c.bold}polyglot.config.json${c.reset} — Configuration`
  )

  if (jsonConfig) {
    console.log(
      `  ${c.green}${icon.check}${c.reset} ${c.bold}${jsonConfig.localesDir}/${c.reset} — Locale files directory`
    )
  }

  if (markdownConfig) {
    console.log(
      `  ${c.green}${icon.check}${c.reset} ${c.bold}${markdownConfig.contentDir}/${markdownConfig.defaultLocale}/${c.reset} — Markdown source directory`
    )
  }

  const hasTracking =
    (jsonConfig?.trackChanges && jsonConfig.trackChanges !== TRACK_CHANGES.OFF) ||
    (markdownConfig?.trackChanges && markdownConfig.trackChanges !== TRACK_CHANGES.OFF)

  if (hasTracking) {
    console.log(
      `  ${c.green}${icon.check}${c.reset} ${c.bold}.polyglot-lock.json${c.reset} — Will be created on first sync`
    )
  }

  console.log()
  console.log(`${c.yellow}${icon.key}${c.reset} ${c.bold}Next steps:${c.reset}`)
  console.log()
  console.log(`  1. Add your API key to ${c.bold}.env${c.reset}:`)
  for (const envName of envVars) {
    console.log(`     ${c.gray}${envName}=${c.yellow}your_api_key_here${c.reset}`)
  }

  let step = 2
  if (jsonConfig) {
    console.log()
    console.log(
      `  ${step}. Run ${c.cyan}${c.bold}npx polyglot-keeper sync${c.reset} to translate locale files`
    )
    step++
  }

  if (markdownConfig) {
    console.log()
    console.log(
      `  ${step}. Run ${c.cyan}${c.bold}npx polyglot-keeper sync --md${c.reset} to translate markdown files`
    )
  }

  console.log()

  return config
}
