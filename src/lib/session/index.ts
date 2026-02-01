/**
 * Session Store Module
 *
 * This is the public API for the session store.
 * Other parts of the app import from here, not from specific implementations.
 *
 * Key pattern: "Dependency Injection via Factory"
 * Instead of importing a specific store directly, code calls getSessionStore()
 * which returns the appropriate implementation based on environment.
 */

import { MemorySessionStore } from './memory-store'
import { RedisSessionStore } from './redis-store'
import { config } from '../config'
import type { SessionStore, LiveSession, Player, Phase } from './types'

// Re-export types for convenience
export type { SessionStore, LiveSession, Player, Phase }

// Re-export Redis store for direct access if needed
export { RedisSessionStore }

// Re-export cleanup functions
export {
  startCleanupService,
  stopCleanupService,
  runCleanup,
  shouldCleanupSession,
} from './cleanup'

// Singleton instance - we only want one store per server
let store: SessionStore | null = null

/**
 * Get the session store instance.
 *
 * This function returns a singleton - calling it multiple times
 * returns the same store instance. This ensures all parts of the
 * app share the same data.
 *
 * Uses config.sessionStoreType to decide which implementation to use:
 * - 'memory': In-memory store (default for development)
 * - 'redis': Redis store (required for production)
 */
export function getSessionStore(): SessionStore {
  if (!store) {
    if (config.sessionStoreType === 'redis') {
      store = new RedisSessionStore()
      console.log('📦 Session store initialized (Redis)')
    } else {
      store = new MemorySessionStore()
      console.log('📦 Session store initialized (in-memory)')
    }
  }
  return store
}

/**
 * Reset the session store (for testing).
 *
 * This clears all data and resets the singleton.
 * Only use this in tests!
 */
export function resetSessionStore(): void {
  if (store) {
    store.clear()
  }
  store = null
}

/**
 * Create a new player object with default values.
 *
 * Helper function that ensures all required fields are set.
 * Makes it easy to create players without specifying every field.
 */
export function createPlayer(
  playerId: string,
  nickname: string,
  socketId: string
): Player {
  return {
    playerId,
    nickname,
    socketId,
    score: 0,
    connected: true,
    lastAnswerIndex: null,
    lastSpellingAnswer: null,
    lastAnswerTime: null,
  }
}
