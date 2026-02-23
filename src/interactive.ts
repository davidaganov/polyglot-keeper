import readline from "node:readline"
import { stdin as input, stdout as output } from "node:process"
import { c, icon } from "@/utils/styles"

export type GlobalAction = "retranslate-all" | "skip-all" | "review"
export type PerKeyAction = "retranslate" | "skip" | "freeze"

/** Option for select menu. */
interface SelectOption<T> {
  value: T
  label: string
  hint?: string
}

const buildSelectLines = <T>(
  title: string,
  options: readonly SelectOption<T>[],
  activeIndex: number,
  prefix = ""
): string[] => {
  const lines: string[] = []

  lines.push(`${prefix}${c.cyan}${icon.pointer} ${c.bold}${title}${c.reset}`)
  lines.push("")

  for (let i = 0; i < options.length; i++) {
    const opt = options[i]
    const isActive = i === activeIndex
    const cursor = isActive ? `${c.cyan}${icon.pointer}${c.reset}` : " "
    const label = isActive
      ? `${c.bold}${c.white}${opt.label}${c.reset}`
      : `${c.white}${opt.label}${c.reset}`
    const hintText = opt.hint ? `  ${c.gray}${opt.hint}${c.reset}` : ""

    if (isActive) {
      lines.push(`  ${cursor} ${c.bgBlue} ${label} ${c.reset}${hintText}`)
    } else {
      lines.push(`  ${cursor} ${label}${hintText}`)
    }
  }

  lines.push("")
  lines.push(`${c.gray}  Use ↑/↓ to navigate, Enter to confirm${c.reset}`)

  return lines
}

const inlineSelect = async <T>(
  title: string,
  options: readonly SelectOption<T>[],
  prefix = ""
): Promise<T> => {
  if (!input.isTTY) {
    return options[0].value
  }

  input.pause()
  readline.emitKeypressEvents(input)
  input.setRawMode(true)
  input.resume()

  let active = 0
  let renderedLineCount = 0

  const render = () => {
    // Clear previous render
    if (renderedLineCount > 0) {
      output.write(`\x1b[${renderedLineCount}A\x1b[J`)
    }

    const lines = buildSelectLines(title, options, active, prefix)
    renderedLineCount = lines.length
    output.write(lines.join("\n") + "\n")
  }

  render()

  return await new Promise<T>((resolve) => {
    const onKeyPress = (_: string, key: readline.Key) => {
      if (key.name === "up") {
        active = (active - 1 + options.length) % options.length
        render()
        return
      }
      if (key.name === "down") {
        active = (active + 1) % options.length
        render()
        return
      }
      if (key.name === "return") {
        cleanup()
        resolve(options[active].value)
        return
      }
      if (key.ctrl && key.name === "c") {
        cleanup()
        process.exit(0)
      }
    }

    const cleanup = () => {
      input.off("keypress", onKeyPress)
      input.setRawMode(false)
      input.pause()
    }

    input.on("keypress", onKeyPress)
  })
}

/**
 * Prompts user to select action for changed keys.
 * @param changedCount - Number of changed keys.
 * @param frozenCount - Number of frozen keys.
 * @returns Selected action.
 */
export const askChangedKeysAction = async (
  changedCount: number,
  frozenCount: number
): Promise<GlobalAction> => {
  console.log()

  let header = `${c.yellow}🔄 Detected ${changedCount} changed source key${changedCount > 1 ? "s" : ""} since last sync.${c.reset}`

  if (frozenCount > 0) {
    header += `\n${c.gray}   ${icon.lock} ${frozenCount} frozen key${frozenCount > 1 ? "s" : ""} skipped${c.reset}`
  }

  console.log(header)
  console.log()

  return inlineSelect<GlobalAction>(
    "What would you like to do?",
    [
      {
        value: "retranslate-all",
        label: "Retranslate all",
        hint: "Update translations for all changed keys"
      },
      {
        value: "skip-all",
        label: "Skip all",
        hint: "Keep current translations"
      },
      {
        value: "review",
        label: "Review one by one",
        hint: "Decide for each key individually"
      }
    ],
    "  "
  )
}

/**
 * Prompts user to select action for a specific key.
 * @param key - Translation key.
 * @param oldValue - Previous value.
 * @param newValue - New value.
 * @param current - Current key index.
 * @param total - Total keys count.
 * @returns Selected action.
 */
export const askPerKeyAction = async (
  key: string,
  oldValue: string,
  newValue: string,
  current: number,
  total: number
): Promise<PerKeyAction> => {
  console.log()
  console.log(
    `  ${c.cyan}${icon.key}${c.reset} ${c.bold}${key}${c.reset}  ${c.gray}(${current}/${total})${c.reset}`
  )
  console.log(`     ${c.red}${c.dim}"${oldValue}"${c.reset}  →  ${c.green}"${newValue}"${c.reset}`)
  console.log()

  return inlineSelect<PerKeyAction>(
    "Action:",
    [
      {
        value: "retranslate",
        label: "Retranslate",
        hint: "Send for new translation in all locales"
      },
      {
        value: "skip",
        label: "Skip",
        hint: "Keep current translations (will ask again next time)"
      },
      {
        value: "freeze",
        label: "Freeze",
        hint: "Lock this key from future retranslation"
      }
    ],
    "    "
  )
}
