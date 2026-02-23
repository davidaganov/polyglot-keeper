import { API_PROVIDER, TRACK_CHANGES, type MarkdownConfig } from "@/interfaces"
import { section, selectOne, askText, parseCommaSeparated, exitWithError } from "@/setup/ui"
import { askProvider, askModel } from "@/setup/shared-steps"
import { c, icon } from "@/utils/styles"

/**
 * Runs the Markdown setup section of the wizard.
 * @param fallbackLocales - Default locales from JSON config.
 * @param fallbackDefaultLocale - Default locale from JSON config.
 * @param isBothMode - Whether both JSON and Markdown modes are enabled.
 * @param mainProvider - Main AI provider from JSON config.
 * @param mainModel - Main AI model from JSON config.
 * @param mainEnvVarName - Main API key variable name from JSON config.
 * @returns Markdown configuration or null if cancelled.
 */
export const setupMdSection = async (
  fallbackLocales?: string[],
  fallbackDefaultLocale?: string,
  isBothMode?: boolean,
  mainProvider?: API_PROVIDER,
  mainModel?: string,
  mainEnvVarName?: string
): Promise<MarkdownConfig | null> => {
  let mdProvider: API_PROVIDER | undefined
  let mdModel: string | undefined

  if (isBothMode && mainProvider && mainModel) {
    section("AI Provider")

    const useCustomProvider = await selectOne<boolean>(
      "Use a different AI provider for Markdown?",
      [
        {
          value: false,
          label: `Same as JSON (${mainProvider})`,
          hint: "Use the same provider and model"
        },
        { value: true, label: "Choose different", hint: "Pick a separate provider/model" }
      ] as const,
      0
    )

    if (useCustomProvider === null) return null

    if (useCustomProvider) {
      const provider = await askProvider()
      if (!provider) return null
      mdProvider = provider

      section("Model")

      const model = await askModel(provider)
      if (!model) return null
      mdModel = model
    } else {
      mdProvider = mainProvider
      mdModel = mainModel
    }
  } else {
    section("AI Provider")

    const provider = await askProvider()
    if (!provider) return null
    mdProvider = provider

    section("Model")

    const model = await askModel(provider)
    if (!model) return null
    mdModel = model
  }

  section("Environment")

  const defaultEnvName = mainEnvVarName
    ? mainEnvVarName.replace("POLYGLOT", "POLYGLOT_MD")
    : "POLYGLOT_MD_API_KEY"
  const mdEnvVarName = await askText("API key variable name for Markdown", defaultEnvName)
  if (!mdEnvVarName) return null

  const fallbackMarkdownLocales =
    fallbackLocales && fallbackLocales.length > 0
      ? fallbackLocales.map((l) => l.toLowerCase())
      : null

  section("Languages")

  const defaultLangs = fallbackMarkdownLocales?.join(", ") || "en, ru"
  const mdLocalesInput = await askText("Which languages do you support?", defaultLangs)
  if (!mdLocalesInput) return null
  const mdLocales = parseCommaSeparated(mdLocalesInput)
  if (mdLocales.length === 0) exitWithError("No languages specified")

  const mdLocaleLabels = mdLocales.map((locale) => locale.toUpperCase())
  console.log(
    `  ${c.green}${icon.check}${c.reset} Configured: ${c.bold}${mdLocaleLabels.join(", ")}${c.reset}`
  )

  section("Default Language")

  const fallbackDefault = fallbackDefaultLocale?.toLowerCase()
  const defaultIndex = fallbackDefault ? Math.max(mdLocales.indexOf(fallbackDefault), 0) : 0

  const mdDefaultLocale = await selectOne<string>(
    "Which is your primary (source) language?",
    mdLocales.map((locale) => ({ value: locale, label: locale.toUpperCase() })),
    defaultIndex
  )
  if (!mdDefaultLocale) return null

  section("Content Directory")

  const contentDir = await askText("Where to store markdown files?", "content")
  if (!contentDir) return null

  const result: MarkdownConfig = {
    contentDir,
    defaultLocale: mdDefaultLocale,
    locales: mdLocales,
    trackChanges: TRACK_CHANGES.OFF,
    envVarName: mdEnvVarName
  }

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

  result.trackChanges = trackChanges

  result.provider = mdProvider
  result.model = mdModel

  return result
}
