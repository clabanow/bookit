/**
 * State Machine Tests
 *
 * Tests all valid transitions, invalid transitions, and helper functions.
 */

import { describe, it, expect } from 'vitest'
import {
  transition,
  canTransition,
  getValidEvents,
  isGameActive,
  canSubmitAnswer,
  canSubmitKick,
} from '../machine'
import type { Phase } from '@/lib/session/types'
import type { GameEvent } from '../types'

describe('State Machine', () => {
  describe('Valid Transitions', () => {
    it('LOBBY → COUNTDOWN on START_GAME', () => {
      const result = transition('LOBBY', 'START_GAME')
      expect(result.success).toBe(true)
      expect(result.phase).toBe('COUNTDOWN')
    })

    it('COUNTDOWN → QUESTION on COUNTDOWN_COMPLETE', () => {
      const result = transition('COUNTDOWN', 'COUNTDOWN_COMPLETE')
      expect(result.success).toBe(true)
      expect(result.phase).toBe('QUESTION')
    })

    it('QUESTION → REVEAL on TIME_UP', () => {
      const result = transition('QUESTION', 'TIME_UP')
      expect(result.success).toBe(true)
      expect(result.phase).toBe('REVEAL')
    })

    it('REVEAL → LEADERBOARD on SHOW_LEADERBOARD', () => {
      const result = transition('REVEAL', 'SHOW_LEADERBOARD')
      expect(result.success).toBe(true)
      expect(result.phase).toBe('LEADERBOARD')
    })

    it('LEADERBOARD → COUNTDOWN on NEXT_QUESTION (more questions)', () => {
      const result = transition('LEADERBOARD', 'NEXT_QUESTION', {
        currentQuestionIndex: 0,
        totalQuestions: 3,
      })
      expect(result.success).toBe(true)
      expect(result.phase).toBe('COUNTDOWN')
    })

    it('LEADERBOARD → END on GAME_OVER (last question)', () => {
      const result = transition('LEADERBOARD', 'GAME_OVER', {
        currentQuestionIndex: 2,
        totalQuestions: 3,
      })
      expect(result.success).toBe(true)
      expect(result.phase).toBe('END')
    })
  })

  describe('Invalid Transitions', () => {
    it('rejects START_GAME from QUESTION', () => {
      const result = transition('QUESTION', 'START_GAME')
      expect(result.success).toBe(false)
      expect(result.phase).toBe('QUESTION')
      expect(result.error).toContain('Invalid transition')
    })

    it('rejects TIME_UP from LOBBY', () => {
      const result = transition('LOBBY', 'TIME_UP')
      expect(result.success).toBe(false)
      expect(result.phase).toBe('LOBBY')
    })

    it('rejects any event from END', () => {
      const events: GameEvent[] = [
        'START_GAME',
        'COUNTDOWN_COMPLETE',
        'TIME_UP',
        'PENALTY_START',
        'PENALTY_COMPLETE',
        'SHOW_LEADERBOARD',
        'NEXT_QUESTION',
        'GAME_OVER',
      ]

      for (const event of events) {
        const result = transition('END', event)
        expect(result.success).toBe(false)
        expect(result.phase).toBe('END')
      }
    })

    it('rejects COUNTDOWN_COMPLETE from QUESTION', () => {
      const result = transition('QUESTION', 'COUNTDOWN_COMPLETE')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid transition')
    })

    it('rejects going backwards from REVEAL to QUESTION', () => {
      const result = transition('REVEAL', 'TIME_UP')
      expect(result.success).toBe(false)
    })
  })

  describe('Context-Dependent Transitions', () => {
    it('rejects NEXT_QUESTION when no more questions', () => {
      const result = transition('LEADERBOARD', 'NEXT_QUESTION', {
        currentQuestionIndex: 4,
        totalQuestions: 5,
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain('No more questions')
    })

    it('rejects GAME_OVER when more questions remain', () => {
      const result = transition('LEADERBOARD', 'GAME_OVER', {
        currentQuestionIndex: 1,
        totalQuestions: 5,
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain('More questions remain')
    })

    it('allows NEXT_QUESTION without context (no validation)', () => {
      // Without context, we allow the transition
      const result = transition('LEADERBOARD', 'NEXT_QUESTION')
      expect(result.success).toBe(true)
      expect(result.phase).toBe('COUNTDOWN')
    })
  })

  describe('canTransition helper', () => {
    it('returns true for valid transitions', () => {
      expect(canTransition('LOBBY', 'START_GAME')).toBe(true)
      expect(canTransition('COUNTDOWN', 'COUNTDOWN_COMPLETE')).toBe(true)
      expect(canTransition('QUESTION', 'TIME_UP')).toBe(true)
    })

    it('returns false for invalid transitions', () => {
      expect(canTransition('LOBBY', 'TIME_UP')).toBe(false)
      expect(canTransition('END', 'START_GAME')).toBe(false)
      expect(canTransition('QUESTION', 'START_GAME')).toBe(false)
    })
  })

  describe('getValidEvents helper', () => {
    it('returns START_GAME for LOBBY', () => {
      expect(getValidEvents('LOBBY')).toEqual(['START_GAME'])
    })

    it('returns NEXT_QUESTION and GAME_OVER for LEADERBOARD', () => {
      const events = getValidEvents('LEADERBOARD')
      expect(events).toContain('NEXT_QUESTION')
      expect(events).toContain('GAME_OVER')
      expect(events).toHaveLength(2)
    })

    it('returns empty array for END', () => {
      expect(getValidEvents('END')).toEqual([])
    })
  })

  describe('isGameActive helper', () => {
    it('returns false for LOBBY and END', () => {
      expect(isGameActive('LOBBY')).toBe(false)
      expect(isGameActive('END')).toBe(false)
    })

    it('returns true for gameplay phases', () => {
      const activePhases: Phase[] = ['COUNTDOWN', 'QUESTION', 'PENALTY_KICK', 'REVEAL', 'LEADERBOARD']
      for (const phase of activePhases) {
        expect(isGameActive(phase)).toBe(true)
      }
    })
  })

  describe('canSubmitAnswer helper', () => {
    it('returns true only for QUESTION phase', () => {
      expect(canSubmitAnswer('QUESTION')).toBe(true)
    })

    it('returns false for all other phases', () => {
      const otherPhases: Phase[] = ['LOBBY', 'COUNTDOWN', 'PENALTY_KICK', 'REVEAL', 'LEADERBOARD', 'END']
      for (const phase of otherPhases) {
        expect(canSubmitAnswer(phase)).toBe(false)
      }
    })
  })

  describe('Soccer (Penalty Kick) Transitions', () => {
    it('QUESTION → PENALTY_KICK on PENALTY_START', () => {
      const result = transition('QUESTION', 'PENALTY_START')
      expect(result.success).toBe(true)
      expect(result.phase).toBe('PENALTY_KICK')
    })

    it('PENALTY_KICK → REVEAL on PENALTY_COMPLETE', () => {
      const result = transition('PENALTY_KICK', 'PENALTY_COMPLETE')
      expect(result.success).toBe(true)
      expect(result.phase).toBe('REVEAL')
    })

    it('rejects PENALTY_START from non-QUESTION phase', () => {
      const result = transition('LOBBY', 'PENALTY_START')
      expect(result.success).toBe(false)
    })

    it('rejects PENALTY_COMPLETE from non-PENALTY_KICK phase', () => {
      const result = transition('QUESTION', 'PENALTY_COMPLETE')
      expect(result.success).toBe(false)
    })
  })

  describe('canSubmitKick helper', () => {
    it('returns true only for PENALTY_KICK phase', () => {
      expect(canSubmitKick('PENALTY_KICK')).toBe(true)
    })

    it('returns false for all other phases', () => {
      const otherPhases: Phase[] = ['LOBBY', 'COUNTDOWN', 'QUESTION', 'REVEAL', 'LEADERBOARD', 'END']
      for (const phase of otherPhases) {
        expect(canSubmitKick(phase)).toBe(false)
      }
    })
  })

  describe('Full Game Flow', () => {
    it('can complete a full game with 3 questions', () => {
      let phase: Phase = 'LOBBY'
      const totalQuestions = 3

      // Start game - goes to COUNTDOWN
      let result = transition(phase, 'START_GAME')
      expect(result.success).toBe(true)
      phase = result.phase
      expect(phase).toBe('COUNTDOWN')

      // Loop through questions
      for (let q = 0; q < totalQuestions; q++) {
        // Countdown complete - goes to QUESTION
        result = transition(phase, 'COUNTDOWN_COMPLETE')
        expect(result.success).toBe(true)
        phase = result.phase
        expect(phase).toBe('QUESTION')

        // Time up - goes to REVEAL
        result = transition(phase, 'TIME_UP')
        expect(result.success).toBe(true)
        phase = result.phase
        expect(phase).toBe('REVEAL')

        // Show leaderboard
        result = transition(phase, 'SHOW_LEADERBOARD')
        expect(result.success).toBe(true)
        phase = result.phase
        expect(phase).toBe('LEADERBOARD')

        // Next question or game over
        if (q < totalQuestions - 1) {
          result = transition(phase, 'NEXT_QUESTION', {
            currentQuestionIndex: q,
            totalQuestions,
          })
          expect(result.success).toBe(true)
          phase = result.phase
          // NEXT_QUESTION goes back to COUNTDOWN for the next question
          expect(phase).toBe('COUNTDOWN')
        } else {
          result = transition(phase, 'GAME_OVER', {
            currentQuestionIndex: q,
            totalQuestions,
          })
          expect(result.success).toBe(true)
          phase = result.phase
          expect(phase).toBe('END')
        }
      }

      expect(phase).toBe('END')
    })

    it('can complete a full soccer game with penalty kicks', () => {
      let phase: Phase = 'LOBBY'
      const totalQuestions = 2

      // Start game
      let result = transition(phase, 'START_GAME')
      expect(result.success).toBe(true)
      phase = result.phase

      for (let q = 0; q < totalQuestions; q++) {
        // Countdown → Question
        result = transition(phase, 'COUNTDOWN_COMPLETE')
        expect(result.success).toBe(true)
        phase = result.phase
        expect(phase).toBe('QUESTION')

        // Question → Penalty Kick (soccer path)
        result = transition(phase, 'PENALTY_START')
        expect(result.success).toBe(true)
        phase = result.phase
        expect(phase).toBe('PENALTY_KICK')

        // Penalty Kick → Reveal
        result = transition(phase, 'PENALTY_COMPLETE')
        expect(result.success).toBe(true)
        phase = result.phase
        expect(phase).toBe('REVEAL')

        // Reveal → Leaderboard
        result = transition(phase, 'SHOW_LEADERBOARD')
        expect(result.success).toBe(true)
        phase = result.phase
        expect(phase).toBe('LEADERBOARD')

        if (q < totalQuestions - 1) {
          result = transition(phase, 'NEXT_QUESTION', {
            currentQuestionIndex: q,
            totalQuestions,
          })
          phase = result.phase
        } else {
          result = transition(phase, 'GAME_OVER', {
            currentQuestionIndex: q,
            totalQuestions,
          })
          phase = result.phase
          expect(phase).toBe('END')
        }
      }

      expect(phase).toBe('END')
    })
  })
})
