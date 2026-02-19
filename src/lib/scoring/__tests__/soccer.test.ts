/**
 * Soccer Scoring Tests
 *
 * Verifies the dual-gate scoring: quiz correct + penalty scored = points.
 */

import { describe, it, expect } from 'vitest'
import { calculateSoccerScore } from '../soccer'

describe('calculateSoccerScore', () => {
  const baseInput = {
    quizCorrect: true,
    penaltyScored: true,
    answerTimeMs: 5000,
    timeLimitMs: 20000,
    currentStreak: 0,
  }

  it('awards points when both quiz correct and penalty scored', () => {
    const result = calculateSoccerScore(baseInput)
    expect(result.points).toBeGreaterThan(0)
    expect(result.newStreak).toBe(1)
    expect(result.coinsForQuestion).toBeGreaterThan(0)
  })

  it('awards 0 points when quiz is wrong', () => {
    const result = calculateSoccerScore({
      ...baseInput,
      quizCorrect: false,
      penaltyScored: true,
    })
    expect(result.points).toBe(0)
    expect(result.newStreak).toBe(0)
    expect(result.coinsForQuestion).toBe(0)
  })

  it('awards 0 points when penalty is missed', () => {
    const result = calculateSoccerScore({
      ...baseInput,
      quizCorrect: true,
      penaltyScored: false,
    })
    expect(result.points).toBe(0)
    expect(result.newStreak).toBe(0)
    expect(result.coinsForQuestion).toBe(0)
  })

  it('awards 0 points when both wrong', () => {
    const result = calculateSoccerScore({
      ...baseInput,
      quizCorrect: false,
      penaltyScored: false,
    })
    expect(result.points).toBe(0)
    expect(result.newStreak).toBe(0)
  })

  it('uses classic speed bonus for faster answers', () => {
    const fast = calculateSoccerScore({ ...baseInput, answerTimeMs: 1000 })
    const slow = calculateSoccerScore({ ...baseInput, answerTimeMs: 15000 })
    expect(fast.points).toBeGreaterThan(slow.points)
  })

  it('increments streak when scoring', () => {
    const result = calculateSoccerScore({ ...baseInput, currentStreak: 3 })
    expect(result.newStreak).toBe(4)
  })

  it('awards streak bonus coins at 2+ streak', () => {
    const noStreak = calculateSoccerScore({ ...baseInput, currentStreak: 0 })
    const withStreak = calculateSoccerScore({ ...baseInput, currentStreak: 1 })
    // Streak 0 → newStreak 1 (no bonus); Streak 1 → newStreak 2 (bonus kicks in)
    expect(withStreak.coinsForQuestion).toBeGreaterThan(noStreak.coinsForQuestion)
  })
})
