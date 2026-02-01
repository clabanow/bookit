/**
 * Nickname Validation
 *
 * Rules for player nicknames:
 * - 2-20 characters long
 * - Only letters, numbers, spaces, and common punctuation
 * - No leading/trailing whitespace
 * - Not empty or just whitespace
 * - No profanity or inappropriate content
 */

import { checkProfanity } from './profanity'

export interface ValidationResult {
  valid: boolean
  error?: string
}

// Allowed characters: letters, numbers, spaces, hyphens, underscores
const NICKNAME_PATTERN = /^[a-zA-Z0-9\s\-_]+$/

const MIN_LENGTH = 2
const MAX_LENGTH = 20

/**
 * Validate a nickname.
 *
 * @param nickname - The nickname to validate
 * @returns Validation result with error message if invalid
 */
export function validateNickname(nickname: string): ValidationResult {
  // Trim and check for empty
  const trimmed = nickname.trim()

  if (trimmed.length === 0) {
    return { valid: false, error: 'Nickname is required' }
  }

  if (trimmed.length < MIN_LENGTH) {
    return { valid: false, error: `Nickname must be at least ${MIN_LENGTH} characters` }
  }

  if (trimmed.length > MAX_LENGTH) {
    return { valid: false, error: `Nickname must be at most ${MAX_LENGTH} characters` }
  }

  if (!NICKNAME_PATTERN.test(trimmed)) {
    return { valid: false, error: 'Nickname can only contain letters, numbers, spaces, hyphens, and underscores' }
  }

  // Check for profanity
  const profanityCheck = checkProfanity(trimmed)
  if (profanityCheck.containsProfanity) {
    return { valid: false, error: 'Please choose an appropriate nickname' }
  }

  return { valid: true }
}

/**
 * Sanitize a nickname by trimming whitespace.
 * Call this after validation to get the clean version.
 */
export function sanitizeNickname(nickname: string): string {
  return nickname.trim()
}
