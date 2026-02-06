/**
 * Profanity Filter
 *
 * Filters inappropriate words from user-generated content (nicknames, etc.)
 *
 * This is a "stub" implementation - a simple, configurable version that
 * provides the basic functionality. It can be expanded with more sophisticated
 * detection (like ML-based filtering) in the future.
 *
 * How it works:
 * 1. Maintains a configurable blocklist of words
 * 2. Normalizes input to catch common evasion tactics
 * 3. Checks if any blocked word appears in the normalized text
 */

/**
 * Import the real blocklist/allowlist.
 *
 * The word lists are in a separate file (blocklist.ts) for maintainability.
 * They're organized by category (profanity, slurs, sexual, drugs, etc.)
 * with an allowlist for innocent words that contain blocked substrings
 * (e.g., "class" contains "ass").
 */
import {
  DEFAULT_BLOCKLIST as BLOCKLIST_WORDS,
  DEFAULT_ALLOWLIST as ALLOWLIST_WORDS,
} from './blocklist'

/**
 * Character substitutions commonly used to evade filters.
 *
 * People often replace letters with similar-looking numbers/symbols:
 * - 'a' -> '@', '4'
 * - 'e' -> '3'
 * - 'i' -> '1', '!'
 * - 'o' -> '0'
 * - 's' -> '$', '5'
 *
 * We normalize these back to letters before checking.
 */
const CHAR_SUBSTITUTIONS: Record<string, string> = {
  '@': 'a',
  '4': 'a',
  '3': 'e',
  '1': 'i',
  '!': 'i',
  '0': 'o',
  $: 's',
  '5': 's',
}

/**
 * Configuration for the profanity filter.
 */
export interface ProfanityFilterConfig {
  /** Words to block (default: DEFAULT_BLOCKLIST) */
  blocklist?: string[]
  /** Additional words to add to the blocklist */
  additionalWords?: string[]
  /** Words to explicitly allow (overrides blocklist) */
  allowlist?: string[]
}

/**
 * Result of a profanity check.
 */
export interface ProfanityCheckResult {
  /** Whether the text contains profanity */
  containsProfanity: boolean
  /** The blocked words that were found (if any) */
  matchedWords: string[]
}

/**
 * Profanity filter class.
 *
 * Why a class instead of just functions?
 * - Allows configuration to be set once and reused
 * - Makes testing easier (can create instances with different configs)
 * - Can be extended with more features later (caching, stats, etc.)
 */
export class ProfanityFilter {
  private blocklist: Set<string>
  private allowlist: Set<string>

  constructor(config: ProfanityFilterConfig = {}) {
    // Start with default or custom blocklist
    const baseList = config.blocklist ?? BLOCKLIST_WORDS

    // Add any additional words
    const fullList = [...baseList, ...(config.additionalWords ?? [])]

    // Store as lowercase Set for fast lookups
    this.blocklist = new Set(fullList.map((w) => w.toLowerCase()))

    // Merge default allowlist with any custom allowlist
    const baseAllowlist = config.blocklist ? [] : ALLOWLIST_WORDS
    const fullAllowlist = [...baseAllowlist, ...(config.allowlist ?? [])]
    this.allowlist = new Set(fullAllowlist.map((w) => w.toLowerCase()))
  }

  /**
   * Normalize text to catch common evasion tactics.
   *
   * Steps:
   * 1. Convert to lowercase
   * 2. Replace common character substitutions
   * 3. Remove non-alphanumeric characters (except spaces)
   * 4. Collapse multiple spaces
   */
  private normalize(text: string): string {
    let normalized = text.toLowerCase()

    // Replace character substitutions
    for (const [sub, letter] of Object.entries(CHAR_SUBSTITUTIONS)) {
      // Use regex with global flag to replace all occurrences
      normalized = normalized.split(sub).join(letter)
    }

    // Remove non-alphanumeric (keep spaces for word boundary detection)
    normalized = normalized.replace(/[^a-z0-9\s]/g, '')

    // Collapse multiple spaces
    normalized = normalized.replace(/\s+/g, ' ').trim()

    return normalized
  }

  /**
   * Check if text contains any blocked words.
   *
   * @param text - The text to check
   * @returns Result with containsProfanity flag and matched words
   */
  check(text: string): ProfanityCheckResult {
    const normalized = this.normalize(text)
    const matchedWords: string[] = []

    // Split into individual words for allowlist checking
    const inputWords = normalized.split(' ')

    for (const blockedWord of this.blocklist) {
      // Check if blocked word appears in normalized text
      if (!normalized.includes(blockedWord)) {
        continue
      }

      // Check if the match is fully explained by allowlisted words.
      // For example, "class" is allowlisted and contains "ass",
      // so "ass" shouldn't trigger when the input is "class".
      //
      // For multi-word blocked phrases (e.g., "kill yourself"),
      // no single input word will contain the full phrase,
      // so they're always flagged.
      const wordsContainingBlocked = inputWords.filter((w) => w.includes(blockedWord))
      const isExplainedByAllowlist =
        wordsContainingBlocked.length > 0 &&
        wordsContainingBlocked.every((w) => this.allowlist.has(w))

      if (!isExplainedByAllowlist) {
        matchedWords.push(blockedWord)
      }
    }

    return {
      containsProfanity: matchedWords.length > 0,
      matchedWords,
    }
  }

  /**
   * Check if text is clean (no profanity).
   *
   * Convenience method - just the boolean, no details.
   */
  isClean(text: string): boolean {
    return !this.check(text).containsProfanity
  }

  /**
   * Add a word to the blocklist at runtime.
   */
  addBlockedWord(word: string): void {
    this.blocklist.add(word.toLowerCase())
  }

  /**
   * Remove a word from the blocklist at runtime.
   */
  removeBlockedWord(word: string): void {
    this.blocklist.delete(word.toLowerCase())
  }

  /**
   * Add a word to the allowlist at runtime.
   */
  addAllowedWord(word: string): void {
    this.allowlist.add(word.toLowerCase())
  }

  /**
   * Get the current blocklist (for debugging/admin).
   */
  getBlocklist(): string[] {
    return Array.from(this.blocklist)
  }
}

// Default singleton instance
let defaultFilter: ProfanityFilter | null = null

/**
 * Get the default profanity filter instance.
 */
export function getProfanityFilter(): ProfanityFilter {
  if (!defaultFilter) {
    defaultFilter = new ProfanityFilter()
  }
  return defaultFilter
}

/**
 * Convenience function to check text with the default filter.
 *
 * @param text - The text to check
 * @returns true if the text is clean, false if it contains profanity
 */
export function isCleanText(text: string): boolean {
  return getProfanityFilter().isClean(text)
}

/**
 * Convenience function to check text and get details.
 *
 * @param text - The text to check
 * @returns Check result with containsProfanity and matchedWords
 */
export function checkProfanity(text: string): ProfanityCheckResult {
  return getProfanityFilter().check(text)
}
