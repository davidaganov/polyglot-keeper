import fs from "node:fs/promises"

/**
 * Checks if a file exists.
 * @param filePath - Path to check.
 * @returns True if file exists.
 */
export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}
