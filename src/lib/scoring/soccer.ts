/**
 * Soccer Stud Scoring
 *
 * In soccer mode, points are only earned if the player:
 * 1. Answers the quiz question correctly, AND
 * 2. Scores the penalty kick (goalie dives wrong way)
 *
 * If both gates pass, the point/coin calculation is the same as
 * classic quiz (BASE 1000 + speed bonus + streak coins).
 * If either gate fails, the player gets 0 points and their streak resets.
 */

import { calculateScore } from './classic'
import { calculateCoinsForQuestion } from './coins'

interface SoccerScoreInput {
  /** Did the player answer the quiz correctly? */
  quizCorrect: boolean
  /** Did the penalty kick go in? */
  penaltyScored: boolean
  /** Time taken to answer the quiz question (ms) */
  answerTimeMs: number
  /** Total time limit for the quiz question (ms) */
  timeLimitMs: number
  /** Current streak BEFORE this question */
  currentStreak: number
}

interface SoccerScoreResult {
  /** Points earned (0 if either gate failed) */
  points: number
  /** Updated streak after this question */
  newStreak: number
  /** Coins earned for this question */
  coinsForQuestion: number
}

/**
 * Calculate score for a soccer question.
 *
 * Must pass both gates (quiz correct AND penalty scored) for any points.
 * Uses the classic scoring formula for point calculation.
 */
export function calculateSoccerScore(input: SoccerScoreInput): SoccerScoreResult {
  const { quizCorrect, penaltyScored, answerTimeMs, timeLimitMs, currentStreak } = input

  // Both gates must pass
  const scored = quizCorrect && penaltyScored

  if (!scored) {
    return {
      points: 0,
      newStreak: 0,
      coinsForQuestion: 0,
    }
  }

  // Player scored! Use classic formula for points
  const points = calculateScore(true, answerTimeMs, timeLimitMs)
  const newStreak = currentStreak + 1
  const coinsForQuestion = calculateCoinsForQuestion(true, newStreak)

  return {
    points,
    newStreak,
    coinsForQuestion,
  }
}
