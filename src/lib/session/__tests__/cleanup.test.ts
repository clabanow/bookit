/**
 * Session Cleanup Tests
 *
 * Tests the session expiration and cleanup logic.
 */

import { describe, it, expect } from 'vitest'
import {
  shouldCleanupSession,
  HOST_DISCONNECT_GRACE_PERIOD_MS,
  LOBBY_TIMEOUT_MS,
} from '../cleanup'

describe('Session Cleanup', () => {
  describe('shouldCleanupSession', () => {
    const now = Date.now()

    describe('Host disconnect timeout', () => {
      it('returns false when host is connected', () => {
        const session = {
          phase: 'LOBBY',
          createdAt: now - 1000,
          hostConnected: true,
          hostDisconnectedAt: null,
        }
        expect(shouldCleanupSession(session, now)).toBe(false)
      })

      it('returns false when host just disconnected', () => {
        const session = {
          phase: 'LOBBY',
          createdAt: now - 1000,
          hostConnected: false,
          hostDisconnectedAt: now - 1000, // 1 second ago
        }
        expect(shouldCleanupSession(session, now)).toBe(false)
      })

      it('returns true when host disconnected past grace period', () => {
        const session = {
          phase: 'LOBBY',
          createdAt: now - 1000,
          hostConnected: false,
          hostDisconnectedAt: now - HOST_DISCONNECT_GRACE_PERIOD_MS - 1000, // Past grace period
        }
        expect(shouldCleanupSession(session, now)).toBe(true)
      })

      it('returns false when host disconnected exactly at grace period', () => {
        const session = {
          phase: 'LOBBY',
          createdAt: now - 1000,
          hostConnected: false,
          hostDisconnectedAt: now - HOST_DISCONNECT_GRACE_PERIOD_MS + 1000, // Just under grace period
        }
        expect(shouldCleanupSession(session, now)).toBe(false)
      })
    })

    describe('LOBBY timeout', () => {
      it('returns false for fresh LOBBY session', () => {
        const session = {
          phase: 'LOBBY',
          createdAt: now - 1000, // 1 second old
          hostConnected: true,
          hostDisconnectedAt: null,
        }
        expect(shouldCleanupSession(session, now)).toBe(false)
      })

      it('returns true for stale LOBBY session', () => {
        const session = {
          phase: 'LOBBY',
          createdAt: now - LOBBY_TIMEOUT_MS - 1000, // Past timeout
          hostConnected: true,
          hostDisconnectedAt: null,
        }
        expect(shouldCleanupSession(session, now)).toBe(true)
      })

      it('returns false for old session not in LOBBY', () => {
        const session = {
          phase: 'QUESTION',
          createdAt: now - LOBBY_TIMEOUT_MS - 1000, // Past timeout but not in LOBBY
          hostConnected: true,
          hostDisconnectedAt: null,
        }
        expect(shouldCleanupSession(session, now)).toBe(false)
      })
    })

    describe('Active game sessions', () => {
      it('returns false for active QUESTION phase', () => {
        const session = {
          phase: 'QUESTION',
          createdAt: now - 1000,
          hostConnected: true,
          hostDisconnectedAt: null,
        }
        expect(shouldCleanupSession(session, now)).toBe(false)
      })

      it('returns false for active LEADERBOARD phase', () => {
        const session = {
          phase: 'LEADERBOARD',
          createdAt: now - 1000,
          hostConnected: true,
          hostDisconnectedAt: null,
        }
        expect(shouldCleanupSession(session, now)).toBe(false)
      })

      it('returns false for recently ended game with host connected', () => {
        const session = {
          phase: 'END',
          createdAt: now - 1000,
          hostConnected: true,
          hostDisconnectedAt: null,
        }
        expect(shouldCleanupSession(session, now)).toBe(false)
      })
    })
  })

  describe('Constants', () => {
    it('has reasonable HOST_DISCONNECT_GRACE_PERIOD_MS (5 minutes)', () => {
      expect(HOST_DISCONNECT_GRACE_PERIOD_MS).toBe(5 * 60 * 1000)
    })

    it('has reasonable LOBBY_TIMEOUT_MS (1 hour)', () => {
      expect(LOBBY_TIMEOUT_MS).toBe(60 * 60 * 1000)
    })
  })
})
