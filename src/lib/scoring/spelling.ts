/**
 * Spelling Mode Scoring
 *
 * Checks if a player's spelling answer is correct and calculates points.
 *
 * Matching rules:
 * - Case insensitive (APPLE = apple = Apple)
 * - Trims whitespace
 * - Must be exact match (no partial credit for now)
 *
 * Scoring is similar to multiple choice:
 * - Correct answer: base points + speed bonus
 * - Wrong answer: 0 points
 */

export interface SpellingResult {
  correct: boolean
  points: number
  submittedAnswer: string
  correctAnswer: string
}

export interface SpellingScoreInput {
  submittedAnswer: string
  correctAnswer: string
  timeTakenMs: number // How long they took to answer
  timeLimitMs: number // Total time allowed
}

// Base points for correct spelling
const BASE_POINTS = 1000

// Maximum bonus points for speed
const SPEED_BONUS_MAX = 500

/**
 * Check a spelling answer and calculate score
 */
export function scoreSpellingAnswer(input: SpellingScoreInput): SpellingResult {
  const submitted = normalizeAnswer(input.submittedAnswer)
  const correct = normalizeAnswer(input.correctAnswer)

  const isCorrect = submitted === correct

  let points = 0
  if (isCorrect) {
    // Base points
    points = BASE_POINTS

    // Speed bonus: faster answers get more points
    // Linear scale from SPEED_BONUS_MAX (instant) to 0 (at time limit)
    const timeRatio = Math.max(0, 1 - input.timeTakenMs / input.timeLimitMs)
    points += Math.floor(SPEED_BONUS_MAX * timeRatio)
  }

  return {
    correct: isCorrect,
    points,
    submittedAnswer: input.submittedAnswer,
    correctAnswer: input.correctAnswer,
  }
}

/**
 * Normalize an answer for comparison
 * - Lowercase
 * - Trim whitespace
 * - Remove extra spaces
 */
function normalizeAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single
}

/**
 * Check if two spellings match (for quick checks)
 */
export function isSpellingCorrect(submitted: string, correct: string): boolean {
  return normalizeAnswer(submitted) === normalizeAnswer(correct)
}

/**
 * Get a hint about how close the answer is (for future partial credit)
 * Returns a similarity score from 0 to 1
 */
export function getSpellingSimilarity(submitted: string, correct: string): number {
  const s1 = normalizeAnswer(submitted)
  const s2 = normalizeAnswer(correct)

  if (s1 === s2) return 1
  if (s1.length === 0 || s2.length === 0) return 0

  // Levenshtein distance-based similarity
  const distance = levenshteinDistance(s1, s2)
  const maxLength = Math.max(s1.length, s2.length)

  return Math.max(0, 1 - distance / maxLength)
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length
  const n = s2.length

  // Create distance matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  // Fill in the rest
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j], // deletion
          dp[i][j - 1], // insertion
          dp[i - 1][j - 1] // substitution
        )
      }
    }
  }

  return dp[m][n]
}
