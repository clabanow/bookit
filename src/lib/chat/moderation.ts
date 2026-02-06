/**
 * Chat Moderation
 *
 * Validates and moderates chat messages before they're sent.
 * Combines length checks, XSS detection, profanity filtering,
 * and text sanitization into a single pipeline.
 *
 * Why a single function instead of separate checks?
 * - Chat messages need ALL checks to pass, so it's simpler to run them
 *   in sequence and bail out early on the first failure.
 * - The caller gets a clean result: allowed + sanitized text, or rejected + reason.
 */

import { sanitizeText, containsXSSPatterns } from '@/lib/validation/schemas'
import { isCleanText } from '@/lib/validation/profanity'

/** Maximum message length in characters */
const MAX_MESSAGE_LENGTH = 200

export interface ModerationResult {
  allowed: boolean
  sanitized?: string
  reason?: string
}

/**
 * Moderate a chat message through the full validation pipeline.
 *
 * Steps:
 * 1. Type check — must be a non-empty string
 * 2. Length check — 1-200 characters after trimming
 * 3. XSS check — reject script tags, event handlers, etc.
 * 4. Profanity check — reject blocked words (with allowlist for "class", "bass", etc.)
 * 5. Sanitize — escape HTML entities for safe display
 */
export function moderateMessage(content: unknown): ModerationResult {
  // Type check
  if (typeof content !== 'string') {
    return { allowed: false, reason: 'Message must be a string' }
  }

  const trimmed = content.trim()

  // Empty check
  if (trimmed.length === 0) {
    return { allowed: false, reason: 'Message cannot be empty' }
  }

  // Length check
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { allowed: false, reason: `Message must be ${MAX_MESSAGE_LENGTH} characters or less` }
  }

  // XSS pattern check (before sanitization so we reject rather than silently modify)
  if (containsXSSPatterns(trimmed)) {
    return { allowed: false, reason: 'Message contains disallowed content' }
  }

  // Profanity check (on raw text, not sanitized — the filter normalizes internally)
  if (!isCleanText(trimmed)) {
    return { allowed: false, reason: 'Message contains inappropriate language' }
  }

  // Sanitize for safe display (escape HTML entities)
  const sanitized = sanitizeText(trimmed)

  return { allowed: true, sanitized }
}
