/**
 * Classic Scoring Tests
 *
 * Tests the scoring formula for correct/incorrect answers
 * and speed bonuses.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateScore,
  calculateScoreFromTimestamps,
  getMaxScore,
  getScorePercentage,
  BASE_POINTS,
  MAX_SPEED_BONUS,
  MIN_ANSWER_TIME_MS,
} from '../classic'

describe('Classic Scoring', () => {
  describe('calculateScore', () => {
    const TIME_LIMIT_MS = 20000 // 20 seconds

    describe('Incorrect answers', () => {
      it('returns 0 for incorrect answer', () => {
        expect(calculateScore(false, 1000, TIME_LIMIT_MS)).toBe(0)
      })

      it('returns 0 for incorrect answer regardless of speed', () => {
        expect(calculateScore(false, 100, TIME_LIMIT_MS)).toBe(0)
        expect(calculateScore(false, 10000, TIME_LIMIT_MS)).toBe(0)
        expect(calculateScore(false, 19999, TIME_LIMIT_MS)).toBe(0)
      })
    })

    describe('Correct answers - speed bonus', () => {
      it('awards maximum points for very fast answer', () => {
        // Answer at 100ms (minimum valid time)
        const score = calculateScore(true, MIN_ANSWER_TIME_MS, TIME_LIMIT_MS)
        // Should be very close to max (1500)
        expect(score).toBeGreaterThanOrEqual(BASE_POINTS + MAX_SPEED_BONUS - 10)
      })

      it('awards base points only at time limit', () => {
        const score = calculateScore(true, TIME_LIMIT_MS, TIME_LIMIT_MS)
        expect(score).toBe(BASE_POINTS)
      })

      it('awards intermediate points for mid-speed answer', () => {
        // Answer at half time = 50% speed bonus
        const score = calculateScore(true, 10000, TIME_LIMIT_MS)
        const expectedBonus = Math.round(MAX_SPEED_BONUS * 0.5)
        expect(score).toBe(BASE_POINTS + expectedBonus)
      })

      it('awards proportional bonus based on remaining time', () => {
        // Answer at 2 seconds = 90% remaining = 450 bonus
        const score = calculateScore(true, 2000, TIME_LIMIT_MS)
        expect(score).toBe(BASE_POINTS + 450)

        // Answer at 15 seconds = 25% remaining = 125 bonus
        const score2 = calculateScore(true, 15000, TIME_LIMIT_MS)
        expect(score2).toBe(BASE_POINTS + 125)
      })
    })

    describe('Edge cases', () => {
      it('handles suspiciously fast answers (gives base only)', () => {
        const score = calculateScore(true, 50, TIME_LIMIT_MS)
        expect(score).toBe(BASE_POINTS)
      })

      it('handles answers after time limit (gives base only)', () => {
        const score = calculateScore(true, 25000, TIME_LIMIT_MS)
        expect(score).toBe(BASE_POINTS)
      })

      it('handles negative answer time', () => {
        const score = calculateScore(true, -1000, TIME_LIMIT_MS)
        expect(score).toBe(BASE_POINTS)
      })

      it('handles zero time limit', () => {
        const score = calculateScore(true, 1000, 0)
        expect(score).toBe(BASE_POINTS)
      })

      it('handles very short time limits', () => {
        // 1 second limit, answer at 500ms = 50% bonus
        const score = calculateScore(true, 500, 1000)
        expect(score).toBe(BASE_POINTS + 250)
      })
    })
  })

  describe('calculateScoreFromTimestamps', () => {
    it('calculates correctly from timestamps', () => {
      const questionStart = 1000000
      const answerTime = 1005000 // 5 seconds later
      const timeLimitSec = 20

      const score = calculateScoreFromTimestamps(
        true,
        questionStart,
        answerTime,
        timeLimitSec
      )

      // 5 seconds out of 20 = 75% remaining = 375 bonus
      expect(score).toBe(BASE_POINTS + 375)
    })

    it('returns 0 for incorrect answer', () => {
      const score = calculateScoreFromTimestamps(false, 1000000, 1005000, 20)
      expect(score).toBe(0)
    })
  })

  describe('getMaxScore', () => {
    it('returns sum of base and max bonus', () => {
      expect(getMaxScore()).toBe(BASE_POINTS + MAX_SPEED_BONUS)
    })

    it('equals 1500 with current constants', () => {
      expect(getMaxScore()).toBe(1500)
    })
  })

  describe('getScorePercentage', () => {
    it('returns 100% for max score', () => {
      expect(getScorePercentage(1500)).toBe(100)
    })

    it('returns 67% for base points only', () => {
      // 1000 / 1500 = 66.67% ≈ 67%
      expect(getScorePercentage(1000)).toBe(67)
    })

    it('returns 0% for zero points', () => {
      expect(getScorePercentage(0)).toBe(0)
    })

    it('returns 50% for 750 points', () => {
      expect(getScorePercentage(750)).toBe(50)
    })
  })

  describe('Constants', () => {
    it('has expected BASE_POINTS value', () => {
      expect(BASE_POINTS).toBe(1000)
    })

    it('has expected MAX_SPEED_BONUS value', () => {
      expect(MAX_SPEED_BONUS).toBe(500)
    })

    it('has reasonable MIN_ANSWER_TIME_MS', () => {
      expect(MIN_ANSWER_TIME_MS).toBeGreaterThan(0)
      expect(MIN_ANSWER_TIME_MS).toBeLessThan(500)
    })
  })
})
