/**
 * State Machine Types
 *
 * This defines the game's state machine - a pattern for managing
 * which phase the game is in and controlling valid transitions.
 *
 * Why use a state machine?
 * - Prevents invalid states (e.g., showing answers before question ends)
 * - Makes game logic predictable and testable
 * - Self-documents the game flow
 *
 * Game Flow:
 * LOBBY → COUNTDOWN → QUESTION → REVEAL → LEADERBOARD → (repeat) → END
 *                        ↑__________________________|
 *
 * Each arrow is a valid transition. Invalid transitions (like END → QUESTION)
 * are rejected by the state machine.
 */

/**
 * All possible game phases.
 * Re-exported from session types for convenience.
 */
export type { Phase } from '@/lib/session/types'

/**
 * Events that can trigger phase transitions.
 *
 * Unlike phases (which are states), events are "triggers" that
 * cause the state machine to move from one phase to another.
 */
export type GameEvent =
  | 'START_GAME' // Host starts the game
  | 'COUNTDOWN_COMPLETE' // 3-2-1 countdown finished
  | 'TIME_UP' // Question timer expired
  | 'PENALTY_START' // Soccer: quiz phase ends, enter penalty kick phase
  | 'PENALTY_COMPLETE' // Soccer: all kicks resolved, show results
  | 'SHOW_LEADERBOARD' // All answers in or reveal complete
  | 'NEXT_QUESTION' // Move to next question
  | 'GAME_OVER' // Last question completed

/**
 * Result of a transition attempt.
 *
 * success: true if the transition was valid
 * phase: the new phase after transition (or current phase if invalid)
 * error: reason for failure if invalid
 */
export interface TransitionResult {
  success: boolean
  phase: import('@/lib/session/types').Phase
  error?: string
}

/**
 * Context passed to the state machine for making decisions.
 * Some transitions depend on game state (e.g., more questions left?)
 */
export interface GameContext {
  currentQuestionIndex: number
  totalQuestions: number
}
