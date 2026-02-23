import { LOCALE_FORMAT, TRACK_CHANGES, type JsonConfig } from "@/interfaces"
import { section, selectOne, askText, parseLocalesInput, exitWithError } from "@/setup/ui"
import { askProvider, askModel } from "@/setup/shared-steps"
import { c, icon } from "@/utils/styles"

/**
 * Runs the JSON locale setup section of the wizard.
 * @returns JSON configuration or null if cancelled.
 */
export const setupJsonSection = async (): Promise<JsonConfig | null> => {
  section("AI Provider")

  const provider = await askProvider()
  if (!provider) return null

  section("Model")

  const model = await askModel(provider)
  if (!model) return null

  section("Environment")

  const envVarName = await askText("API key variable name for JSON", "POLYGLOT_API_KEY")
  if (!envVarName) return null

  section("Locale Format")

  const localeFormat = await selectOne<LOCALE_FORMAT>(
    "How should locale files be named?",
    [
      {
        value: LOCALE_FORMAT.SHORT,
        label: "en.json, ru.json",
        hint: "Simple locale codes (recommended)"
      },
      {
        value: LOCALE_FORMAT.PAIR,
        label: "en-US.json, ru-RU.json",
        hint: "Full BCP 47 language tags"
      }
    ] as const,
    0
  )

  if (!localeFormat) return null

  section("Languages")

  const localesInput = await askText("Which languages do you support?", "en, ru")
  if (!localesInput) return null

  const locales = parseLocalesInput(localesInput)
  if (locales.length === 0) exitWithError("No languages specified")

  console.log(
    `  ${c.green}${icon.check}${c.reset} Configured: ${c.bold}${locales.join(", ")}${c.reset}`
  )

  section("Default Language")

  const defaultLocale = await selectOne<string>(
    "Which is your primary (source) language?",
    locales.map((l) => ({ value: l, label: l })),
    0
  )

  if (!defaultLocale) return null

  section("Locale Directory")

  const localesDir = await askText("Where to store locale files?", "src/i18n")
  if (!localesDir) return null

  section("Change Tracking")

  const trackChanges = await selectOne<TRACK_CHANGES>(
    "Track source value changes?",
    [
      {
        value: TRACK_CHANGES.CAREFULLY,
        label: "Carefully",
        hint: "Review each change interactively before retranslating"
      },
      {
        value: TRACK_CHANGES.ON,
        label: "On",
        hint: "Auto-retranslate all changed keys"
      },
      {
        value: TRACK_CHANGES.OFF,
        label: "Off",
        hint: "Only translate new/missing keys"
      }
    ] as const,
    0
  )
  if (trackChanges === null) return null

  return {
    provider,
    model,
    envVarName,
    localeFormat,
    locales,
    defaultLocale,
    localesDir,
    trackChanges
  }
}
