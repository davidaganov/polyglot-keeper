#!/usr/bin/env node
import { run } from "@/index"

/**
 * CLI entry point for polyglot-keeper.
 * Parses command line arguments and runs the application.
 */
const args = process.argv.slice(2)
const setup = args.includes("--setup") || args.includes("init")
const force = args.includes("--force")
const md = args.includes("--md")
const rootDir = process.cwd()

run({ rootDir, setup, force, md }).catch((err) => {
  console.error("🚨 Fatal error:", err)
  process.exit(1)
})
