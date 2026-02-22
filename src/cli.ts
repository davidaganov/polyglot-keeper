#!/usr/bin/env node
import { run } from "@/index"

const args = process.argv.slice(2)
const setup = args.includes("--setup") || args.includes("init")
const force = args.includes("--force")
const rootDir = process.cwd()

run({ rootDir, setup, force }).catch((err) => {
  console.error("🚨 Fatal error:", err)
  process.exit(1)
})
