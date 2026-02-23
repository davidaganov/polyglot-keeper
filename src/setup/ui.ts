import readline from "node:readline"
import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { c, icon } from "@/utils/styles"

/** Clears the terminal screen. */
export const clearScreen = (): void => {
  output.write("\x1b[2J\x1b[0f")
}

/**
 * Generates the title banner for the setup wizard.
 * @returns Formatted banner string.
 */
export const titleBanner = (): string => {
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

/**
 * Prints a section header in the terminal.
 * @param title - Section title to display.
 */
export const section = (title: string): void => {
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

/**
 * Prompts user to select one option from a list.
 * @param title - Question to display.
 * @param options - Available options.
 * @param initialIndex - Default selected index.
 * @returns Selected value or null if cancelled.
 */
export const selectOne = async <T>(
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
      input.pause()
      output.write("\n")
    }

    input.on("keypress", onKeyPress)
  })
}

/**
 * Prompts user for text input.
 * @param message - Question to display.
 * @param initialValue - Default value if user enters nothing.
 * @returns User input or default value.
 */
export const askText = async (message: string, initialValue: string): Promise<string | null> => {
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

/**
 * Parses comma-separated locale input into uppercase array.
 * @param raw - Raw input string.
 * @returns Array of unique uppercase locale codes.
 */
export const parseLocalesInput = (raw: string): string[] => {
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

/**
 * Parses comma-separated values into trimmed array.
 * @param raw - Raw input string.
 * @returns Array of trimmed strings.
 */
export const parseCommaSeparated = (raw: string): string[] => {
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

/**
 * Exits with error message.
 * @param message - Error message to display.
 * @returns Never returns.
 */
export const exitWithError = (message: string): never => {
  console.log(`\n${c.red}${icon.cross} ${message}${c.reset}`)
  process.exit(1)
}
