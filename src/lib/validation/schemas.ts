/**
 * Input Validation Schemas
 *
 * Centralized validation for all user inputs. This prevents:
 * - XSS (Cross-Site Scripting) attacks
 * - SQL injection (though Prisma handles this)
 * - Invalid data corrupting game state
 *
 * Each validator returns { valid: boolean, error?: string, sanitized?: T }
 */

/**
 * Result of a validation operation.
 */
export interface ValidationResult<T = string> {
  valid: boolean
  error?: string
  sanitized?: T
}

/**
 * Validate and sanitize a room code.
 *
 * Room codes are:
 * - 6 characters
 * - Uppercase alphanumeric (no O, 0, I, L for clarity)
 */
export function validateRoomCode(input: unknown): ValidationResult {
  if (typeof input !== 'string') {
    return { valid: false, error: 'Room code must be a string' }
  }

  const sanitized = input.toUpperCase().trim()

  if (sanitized.length !== 6) {
    return { valid: false, error: 'Room code must be 6 characters' }
  }

  // Only allow unambiguous characters
  const validChars = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/
  if (!validChars.test(sanitized)) {
    return { valid: false, error: 'Invalid room code format' }
  }

  return { valid: true, sanitized }
}

/**
 * Validate question set title.
 */
export function validateTitle(input: unknown): ValidationResult {
  if (typeof input !== 'string') {
    return { valid: false, error: 'Title must be a string' }
  }

  const sanitized = sanitizeText(input.trim())

  if (sanitized.length === 0) {
    return { valid: false, error: 'Title cannot be empty' }
  }

  if (sanitized.length > 100) {
    return { valid: false, error: 'Title must be 100 characters or less' }
  }

  return { valid: true, sanitized }
}

/**
 * Validate question prompt.
 */
export function validateQuestionPrompt(input: unknown): ValidationResult {
  if (typeof input !== 'string') {
    return { valid: false, error: 'Question must be a string' }
  }

  const sanitized = sanitizeText(input.trim())

  if (sanitized.length === 0) {
    return { valid: false, error: 'Question cannot be empty' }
  }

  if (sanitized.length > 500) {
    return { valid: false, error: 'Question must be 500 characters or less' }
  }

  return { valid: true, sanitized }
}

/**
 * Validate answer option.
 */
export function validateAnswerOption(input: unknown): ValidationResult {
  if (typeof input !== 'string') {
    return { valid: false, error: 'Answer must be a string' }
  }

  const sanitized = sanitizeText(input.trim())

  if (sanitized.length === 0) {
    return { valid: false, error: 'Answer cannot be empty' }
  }

  if (sanitized.length > 200) {
    return { valid: false, error: 'Answer must be 200 characters or less' }
  }

  return { valid: true, sanitized }
}

/**
 * Validate answer index (0-3).
 */
export function validateAnswerIndex(input: unknown): ValidationResult<number> {
  if (typeof input !== 'number') {
    return { valid: false, error: 'Answer index must be a number' }
  }

  if (!Number.isInteger(input)) {
    return { valid: false, error: 'Answer index must be an integer' }
  }

  if (input < 0 || input > 3) {
    return { valid: false, error: 'Answer index must be 0-3' }
  }

  return { valid: true, sanitized: input }
}

/**
 * Validate time limit in seconds.
 */
export function validateTimeLimit(input: unknown): ValidationResult<number> {
  if (typeof input !== 'number') {
    return { valid: false, error: 'Time limit must be a number' }
  }

  if (!Number.isInteger(input)) {
    return { valid: false, error: 'Time limit must be an integer' }
  }

  if (input < 5) {
    return { valid: false, error: 'Time limit must be at least 5 seconds' }
  }

  if (input > 120) {
    return { valid: false, error: 'Time limit must be 120 seconds or less' }
  }

  return { valid: true, sanitized: input }
}

/**
 * Validate session ID (UUID format).
 */
export function validateSessionId(input: unknown): ValidationResult {
  if (typeof input !== 'string') {
    return { valid: false, error: 'Session ID must be a string' }
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidPattern.test(input)) {
    return { valid: false, error: 'Invalid session ID format' }
  }

  return { valid: true, sanitized: input.toLowerCase() }
}

/**
 * Sanitize text to prevent XSS.
 *
 * Removes/escapes potentially dangerous characters while
 * preserving normal text content.
 */
export function sanitizeText(input: string): string {
  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Escape HTML special characters
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    // Remove control characters (except newlines and tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

/**
 * Check if a string contains potential XSS patterns.
 * This is a heuristic check - sanitizeText is the real defense.
 */
export function containsXSSPatterns(input: string): boolean {
  const lowerInput = input.toLowerCase()

  const dangerousPatterns = [
    '<script',
    'javascript:',
    'onerror=',
    'onclick=',
    'onload=',
    'onmouseover=',
    'onfocus=',
    'eval(',
    'expression(',
    'url(',
    'import(',
  ]

  return dangerousPatterns.some((pattern) => lowerInput.includes(pattern))
}
