/**
 * Classic Scoring Logic
 *
 * Calculates points for correct answers based on speed.
 *
 * Scoring Formula:
 * - Wrong answer: 0 points
 * - Correct answer: BASE_POINTS + SPEED_BONUS
 *
 * Speed Bonus:
 * - Answering instantly: Full bonus (500 points)
 * - Answering at the last second: No bonus (0 points)
 * - Linear decrease based on time spent
 *
 * Example (20 second question):
 * - Answer in 2 seconds: 1000 + 450 = 1450 points
 * - Answer in 10 seconds: 1000 + 250 = 1250 points
 * - Answer in 19 seconds: 1000 + 25 = 1025 points
 * - Wrong answer at any time: 0 points
 */

/** Base points awarded for any correct answer */
export const BASE_POINTS = 1000

/** Maximum bonus points for answering quickly */
export const MAX_SPEED_BONUS = 500

/** Minimum time in ms before we consider it a valid answer (anti-cheat) */
export const MIN_ANSWER_TIME_MS = 100

/**
 * Calculate points for an answer.
 *
 * @param isCorrect - Whether the answer was correct
 * @param answerTimeMs - Time taken to answer in milliseconds
 * @param timeLimitMs - Total time limit in milliseconds
 * @returns Points earned (0 for incorrect, BASE + bonus for correct)
 */
export function calculateScore(
  isCorrect: boolean,
  answerTimeMs: number,
  timeLimitMs: number
): number {
  // Wrong answer = 0 points
  if (!isCorrect) {
    return 0
  }

  // Validate inputs
  if (answerTimeMs < 0 || timeLimitMs <= 0) {
    return BASE_POINTS // Give base points for edge cases
  }

  // Suspiciously fast answers get base points only (anti-cheat)
  if (answerTimeMs < MIN_ANSWER_TIME_MS) {
    return BASE_POINTS
  }

  // Answers after time limit get base points only
  if (answerTimeMs >= timeLimitMs) {
    return BASE_POINTS
  }

  // Calculate speed bonus
  // Ratio of remaining time (1.0 = instant, 0.0 = at limit)
  const remainingRatio = 1 - answerTimeMs / timeLimitMs
  const speedBonus = Math.round(MAX_SPEED_BONUS * remainingRatio)

  return BASE_POINTS + speedBonus
}

/**
 * Convenience function to calculate score from timestamps.
 *
 * @param isCorrect - Whether the answer was correct
 * @param questionStartTime - When the question started (ms timestamp)
 * @param answerTime - When the answer was submitted (ms timestamp)
 * @param timeLimitSec - Question time limit in seconds
 * @returns Points earned
 */
export function calculateScoreFromTimestamps(
  isCorrect: boolean,
  questionStartTime: number,
  answerTime: number,
  timeLimitSec: number
): number {
  const answerTimeMs = answerTime - questionStartTime
  const timeLimitMs = timeLimitSec * 1000
  return calculateScore(isCorrect, answerTimeMs, timeLimitMs)
}

/**
 * Get the maximum possible score for a question.
 * Useful for displaying "X out of Y possible points".
 */
export function getMaxScore(): number {
  return BASE_POINTS + MAX_SPEED_BONUS
}

/**
 * Calculate what percentage of max points was earned.
 * Useful for showing a "score quality" indicator.
 */
export function getScorePercentage(points: number): number {
  const maxScore = getMaxScore()
  return Math.round((points / maxScore) * 100)
}
