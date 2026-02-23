/** Terminal color codes for styling output. */
export const c = {
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

/** Icon characters used in UI. */
export const icon = {
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
  diamond: "◆",
  lock: "🔒"
} as const
