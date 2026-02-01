/**
 * Session Cleanup Service
 *
 * Handles automatic cleanup of expired or abandoned sessions.
 *
 * Sessions are cleaned up when:
 * - Host has been disconnected for too long (grace period expired)
 * - Session has been in LOBBY too long without starting
 * - Game ended and grace period for viewing results has passed
 *
 * This runs periodically to prevent memory leaks from abandoned sessions.
 */

import { getSessionStore } from './index'

/** How long host can be disconnected before session is deleted (5 minutes) */
export const HOST_DISCONNECT_GRACE_PERIOD_MS = 5 * 60 * 1000

/** How long a session can sit in LOBBY without starting (1 hour) */
export const LOBBY_TIMEOUT_MS = 60 * 60 * 1000

/** How long after game ends before cleanup (10 minutes) */
export const END_GRACE_PERIOD_MS = 10 * 60 * 1000

/** How often to run cleanup (every minute) */
export const CLEANUP_INTERVAL_MS = 60 * 1000

// Track the cleanup interval so we can stop it
let cleanupInterval: NodeJS.Timeout | null = null

/**
 * Check if a session should be cleaned up.
 *
 * @param session - The session to check
 * @param now - Current timestamp
 * @returns true if the session should be deleted
 */
export function shouldCleanupSession(
  session: {
    phase: string
    createdAt: number
    hostConnected: boolean
    hostDisconnectedAt: number | null
  },
  now: number = Date.now()
): boolean {
  // 1. Host disconnected too long
  if (!session.hostConnected && session.hostDisconnectedAt) {
    const disconnectedFor = now - session.hostDisconnectedAt
    if (disconnectedFor > HOST_DISCONNECT_GRACE_PERIOD_MS) {
      return true
    }
  }

  // 2. Stuck in LOBBY too long
  if (session.phase === 'LOBBY') {
    const age = now - session.createdAt
    if (age > LOBBY_TIMEOUT_MS) {
      return true
    }
  }

  // 3. Game ended and grace period passed
  // Note: We'd need to track when the game ended to implement this properly
  // For now, we'll rely on host disconnect for END phase cleanup

  return false
}

/**
 * Run a cleanup pass - check all sessions and delete expired ones.
 *
 * @returns Number of sessions cleaned up
 */
export async function runCleanup(): Promise<number> {
  const store = getSessionStore()
  const now = Date.now()
  let cleanedUp = 0

  // Get all sessions (we need to add a method for this)
  // For now, we'll use the in-memory store's internal structure
  // In production with Redis, we'd use SCAN to iterate
  const memoryStore = store as unknown as {
    sessions?: Map<string, unknown>
  }

  if (!memoryStore.sessions) {
    // Not using memory store, skip cleanup
    return 0
  }

  const sessionsToDelete: string[] = []

  for (const [sessionId, session] of memoryStore.sessions) {
    const typedSession = session as {
      phase: string
      createdAt: number
      hostConnected: boolean
      hostDisconnectedAt: number | null
      roomCode: string
    }

    if (shouldCleanupSession(typedSession, now)) {
      sessionsToDelete.push(sessionId)
      console.log(`🧹 Cleaning up expired session: ${typedSession.roomCode}`)
    }
  }

  // Delete expired sessions
  for (const sessionId of sessionsToDelete) {
    await store.deleteSession(sessionId)
    cleanedUp++
  }

  if (cleanedUp > 0) {
    console.log(`🧹 Cleaned up ${cleanedUp} expired session(s)`)
  }

  return cleanedUp
}

/**
 * Start the periodic cleanup service.
 *
 * Call this once when the server starts.
 */
export function startCleanupService(): void {
  if (cleanupInterval) {
    console.warn('Cleanup service already running')
    return
  }

  console.log('🧹 Starting session cleanup service')

  cleanupInterval = setInterval(() => {
    runCleanup().catch((err) => {
      console.error('Error during session cleanup:', err)
    })
  }, CLEANUP_INTERVAL_MS)

  // Don't prevent the process from exiting
  cleanupInterval.unref()
}

/**
 * Stop the cleanup service.
 *
 * Call this during graceful shutdown.
 */
export function stopCleanupService(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
    console.log('🧹 Stopped session cleanup service')
  }
}
