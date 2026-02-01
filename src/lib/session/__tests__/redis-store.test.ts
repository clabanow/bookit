/**
 * Redis Session Store Tests
 *
 * These tests use ioredis-mock to simulate Redis without needing an actual server.
 * This allows us to test the Redis store logic in isolation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import RedisMock from 'ioredis-mock'

// Mock ioredis before importing the store
vi.mock('ioredis', () => ({
  default: RedisMock,
}))

// Now import after mock is set up
import { RedisSessionStore } from '../redis-store'
import type { Player } from '../types'

describe('RedisSessionStore', () => {
  let store: RedisSessionStore

  beforeEach(() => {
    // Create store with mock Redis
    store = new RedisSessionStore('redis://localhost:6379')
  })

  afterEach(async () => {
    await store.clear()
    await store.disconnect()
  })

  describe('Session Operations', () => {
    it('creates a session with unique ID and room code', async () => {
      const session = await store.createSession('host-socket-1', 'question-set-1')

      expect(session.sessionId).toBeDefined()
      expect(session.roomCode).toHaveLength(6)
      expect(session.hostSocketId).toBe('host-socket-1')
      expect(session.questionSetId).toBe('question-set-1')
      expect(session.phase).toBe('LOBBY')
    })

    it('retrieves session by ID', async () => {
      const created = await store.createSession('host-socket-1', 'question-set-1')
      const retrieved = await store.getSession(created.sessionId)

      expect(retrieved).toEqual(created)
    })

    it('retrieves session by room code', async () => {
      const created = await store.createSession('host-socket-1', 'question-set-1')
      const retrieved = await store.getSessionByCode(created.roomCode)

      expect(retrieved).toEqual(created)
    })

    it('returns null for non-existent session', async () => {
      const session = await store.getSession('non-existent')
      expect(session).toBeNull()
    })

    it('returns null for non-existent room code', async () => {
      const session = await store.getSessionByCode('XXXXXX')
      expect(session).toBeNull()
    })

    it('updates session properties', async () => {
      const session = await store.createSession('host-socket-1', 'question-set-1')

      await store.updateSession(session.sessionId, {
        phase: 'COUNTDOWN',
        currentQuestionIndex: 1,
      })

      const updated = await store.getSession(session.sessionId)
      expect(updated?.phase).toBe('COUNTDOWN')
      expect(updated?.currentQuestionIndex).toBe(1)
    })

    it('throws when updating non-existent session', async () => {
      await expect(
        store.updateSession('non-existent', { phase: 'COUNTDOWN' })
      ).rejects.toThrow('Session not found')
    })

    it('deletes session and all related data', async () => {
      const session = await store.createSession('host-socket-1', 'question-set-1')

      await store.addPlayer(session.sessionId, {
        playerId: 'player-1',
        nickname: 'Player 1',
        socketId: 'socket-1',
        score: 0,
        connected: true,
        lastAnswerIndex: null,
        lastAnswerTime: null, lastSpellingAnswer: null,
      })

      await store.deleteSession(session.sessionId)

      expect(await store.getSession(session.sessionId)).toBeNull()
      expect(await store.getSessionByCode(session.roomCode)).toBeNull()
      expect(await store.getPlayers(session.sessionId)).toEqual([])
    })
  })

  describe('Player Operations', () => {
    let sessionId: string

    beforeEach(async () => {
      const session = await store.createSession('host-socket-1', 'question-set-1')
      sessionId = session.sessionId
    })

    const testPlayer: Player = {
      playerId: 'player-1',
      nickname: 'Test Player',
      socketId: 'socket-1',
      score: 0,
      connected: true,
      lastAnswerIndex: null,
      lastAnswerTime: null, lastSpellingAnswer: null,
    }

    it('adds a player to a session', async () => {
      await store.addPlayer(sessionId, testPlayer)

      const players = await store.getPlayers(sessionId)
      expect(players).toHaveLength(1)
      expect(players[0].playerId).toBe('player-1')
    })

    it('retrieves a specific player', async () => {
      await store.addPlayer(sessionId, testPlayer)

      const player = await store.getPlayer(sessionId, 'player-1')
      expect(player).toEqual(testPlayer)
    })

    it('returns null for non-existent player', async () => {
      const player = await store.getPlayer(sessionId, 'non-existent')
      expect(player).toBeNull()
    })

    it('throws when adding player to non-existent session', async () => {
      await expect(store.addPlayer('non-existent', testPlayer)).rejects.toThrow('Session not found')
    })

    it('throws when adding duplicate player', async () => {
      await store.addPlayer(sessionId, testPlayer)

      await expect(store.addPlayer(sessionId, testPlayer)).rejects.toThrow('Player already exists')
    })

    it('updates player properties', async () => {
      await store.addPlayer(sessionId, testPlayer)

      await store.updatePlayer(sessionId, 'player-1', {
        score: 1000,
        lastAnswerIndex: 2,
      })

      const player = await store.getPlayer(sessionId, 'player-1')
      expect(player?.score).toBe(1000)
      expect(player?.lastAnswerIndex).toBe(2)
    })

    it('throws when updating player in non-existent session', async () => {
      await expect(
        store.updatePlayer('non-existent', 'player-1', { score: 100 })
      ).rejects.toThrow('Session not found')
    })

    it('throws when updating non-existent player', async () => {
      await expect(
        store.updatePlayer(sessionId, 'non-existent', { score: 100 })
      ).rejects.toThrow('Player not found')
    })

    it('removes a player', async () => {
      await store.addPlayer(sessionId, testPlayer)
      await store.removePlayer(sessionId, 'player-1')

      const player = await store.getPlayer(sessionId, 'player-1')
      expect(player).toBeNull()
    })

    it('handles multiple players', async () => {
      await store.addPlayer(sessionId, testPlayer)
      await store.addPlayer(sessionId, {
        ...testPlayer,
        playerId: 'player-2',
        nickname: 'Player 2',
        socketId: 'socket-2',
      })

      const players = await store.getPlayers(sessionId)
      expect(players).toHaveLength(2)
    })
  })

  describe('Utility', () => {
    it('clears all sessions', async () => {
      await store.createSession('host-1', 'set-1')
      await store.createSession('host-2', 'set-2')

      await store.clear()

      const stats = await store.getStats()
      expect(stats.sessions).toBe(0)
    })
  })
})
