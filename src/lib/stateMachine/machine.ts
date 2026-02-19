/**
 * Game State Machine
 *
 * Implements the game phase transitions. This is the "brain" of the game
 * that decides whether a phase change is valid.
 *
 * Pattern: Finite State Machine (FSM)
 * - Finite set of states (phases)
 * - Finite set of events (triggers)
 * - Transitions: (current state, event) → new state
 *
 * The key insight is that we define ALL valid transitions explicitly.
 * Any transition not defined is automatically invalid.
 */

import type { Phase } from '@/lib/session/types'
import type { GameEvent, GameContext, TransitionResult } from './types'

/**
 * Transition table defining valid phase changes.
 *
 * Structure: { [currentPhase]: { [event]: nextPhase } }
 *
 * To read: "From LOBBY, if START_GAME event occurs, go to COUNTDOWN"
 */
const transitions: Record<Phase, Partial<Record<GameEvent, Phase>>> = {
  LOBBY: {
    START_GAME: 'COUNTDOWN',
  },
  COUNTDOWN: {
    COUNTDOWN_COMPLETE: 'QUESTION',
  },
  QUESTION: {
    TIME_UP: 'REVEAL', // Quiz path: straight to reveal
    PENALTY_START: 'PENALTY_KICK', // Soccer path: go to penalty kicks first
  },
  PENALTY_KICK: {
    PENALTY_COMPLETE: 'REVEAL', // After kicks resolve, show results
  },
  REVEAL: {
    SHOW_LEADERBOARD: 'LEADERBOARD',
  },
  LEADERBOARD: {
    NEXT_QUESTION: 'COUNTDOWN', // Goes to countdown before next question
    GAME_OVER: 'END',
  },
  END: {
    // No transitions from END - game is over
  },
}

/**
 * Attempt to transition from one phase to another.
 *
 * @param currentPhase - The current game phase
 * @param event - The event triggering the transition
 * @param context - Optional context for conditional transitions
 * @returns TransitionResult with success/failure and new phase
 */
export function transition(
  currentPhase: Phase,
  event: GameEvent,
  context?: GameContext
): TransitionResult {
  // Look up the next phase for this event
  const nextPhase = transitions[currentPhase]?.[event]

  // If no transition defined, it's invalid
  if (!nextPhase) {
    return {
      success: false,
      phase: currentPhase,
      error: `Invalid transition: cannot ${event} from ${currentPhase}`,
    }
  }

  // Special case: NEXT_QUESTION vs GAME_OVER from LEADERBOARD
  // We need context to decide which one is valid
  if (currentPhase === 'LEADERBOARD') {
    if (context) {
      const isLastQuestion = context.currentQuestionIndex >= context.totalQuestions - 1
      if (event === 'NEXT_QUESTION' && isLastQuestion) {
        return {
          success: false,
          phase: currentPhase,
          error: 'No more questions - use GAME_OVER instead',
        }
      }
      if (event === 'GAME_OVER' && !isLastQuestion) {
        return {
          success: false,
          phase: currentPhase,
          error: 'More questions remain - use NEXT_QUESTION instead',
        }
      }
    }
  }

  return {
    success: true,
    phase: nextPhase,
  }
}

/**
 * Check if a specific event is valid from the current phase.
 * Useful for UI to enable/disable buttons.
 */
export function canTransition(currentPhase: Phase, event: GameEvent): boolean {
  return transitions[currentPhase]?.[event] !== undefined
}

/**
 * Get all valid events from the current phase.
 * Useful for debugging or showing available actions.
 */
export function getValidEvents(currentPhase: Phase): GameEvent[] {
  const phaseTransitions = transitions[currentPhase]
  if (!phaseTransitions) return []
  return Object.keys(phaseTransitions) as GameEvent[]
}

/**
 * Check if the game is in a "playing" state (not lobby or ended).
 */
export function isGameActive(phase: Phase): boolean {
  return phase !== 'LOBBY' && phase !== 'END'
}

/**
 * Check if players can submit answers in the current phase.
 */
export function canSubmitAnswer(phase: Phase): boolean {
  return phase === 'QUESTION'
}

/**
 * Check if players can submit a penalty kick direction.
 * Only valid during the PENALTY_KICK phase (soccer mode).
 */
export function canSubmitKick(phase: Phase): boolean {
  return phase === 'PENALTY_KICK'
}
