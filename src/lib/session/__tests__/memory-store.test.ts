/**
 * Memory Session Store Tests
 *
 * These tests verify all CRUD operations on the session store.
 * They serve as both tests AND documentation for how the store works.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MemorySessionStore } from '../memory-store'
import type { Player } from '../types'

describe('MemorySessionStore', () => {
  let store: MemorySessionStore

  // Create a fresh store before each test
  beforeEach(() => {
    store = new MemorySessionStore()
  })

  describe('Session Operations', () => {
    it('creates a session with unique ID and room code', async () => {
      const session = await store.createSession('host-socket-1', 'question-set-1')

      expect(session.sessionId).toBeDefined()
      expect(session.sessionId.length).toBeGreaterThan(0)
      expect(session.roomCode).toMatch(/^[A-Z0-9]{6}$/) // 6 alphanumeric chars
      expect(session.hostSocketId).toBe('host-socket-1')
      expect(session.questionSetId).toBe('question-set-1')
      expect(session.phase).toBe('LOBBY')
      expect(session.currentQuestionIndex).toBe(0)
      expect(session.createdAt).toBeGreaterThan(0)
    })

    it('creates sessions with unique room codes', async () => {
      const codes = new Set<string>()

      // Create 100 sessions and verify all codes are unique
      for (let i = 0; i < 100; i++) {
        const session = await store.createSession(`host-${i}`, 'qs-1')
        expect(codes.has(session.roomCode)).toBe(false)
        codes.add(session.roomCode)
      }
    })

    it('retrieves a session by ID', async () => {
      const created = await store.createSession('host-1', 'qs-1')
      const retrieved = await store.getSession(created.sessionId)

      expect(retrieved).toEqual(created)
    })

    it('returns null for non-existent session ID', async () => {
      const result = await store.getSession('non-existent-id')
      expect(result).toBeNull()
    })

    it('retrieves a session by room code', async () => {
      const created = await store.createSession('host-1', 'qs-1')
      const retrieved = await store.getSessionByCode(created.roomCode)

      expect(retrieved).toEqual(created)
    })

    it('room code lookup is case-insensitive', async () => {
      const created = await store.createSession('host-1', 'qs-1')
      const retrieved = await store.getSessionByCode(created.roomCode.toLowerCase())

      expect(retrieved).toEqual(created)
    })

    it('returns null for non-existent room code', async () => {
      const result = await store.getSessionByCode('XXXXXX')
      expect(result).toBeNull()
    })

    it('updates session properties', async () => {
      const session = await store.createSession('host-1', 'qs-1')

      await store.updateSession(session.sessionId, {
        phase: 'QUESTION',
        currentQuestionIndex: 2,
        questionStartedAt: Date.now(),
      })

      const updated = await store.getSession(session.sessionId)
      expect(updated?.phase).toBe('QUESTION')
      expect(updated?.currentQuestionIndex).toBe(2)
      expect(updated?.questionStartedAt).toBeGreaterThan(0)

      // Other fields should be unchanged
      expect(updated?.hostSocketId).toBe('host-1')
    })

    it('throws when updating non-existent session', async () => {
      await expect(
        store.updateSession('non-existent', { phase: 'END' })
      ).rejects.toThrow('Session not found')
    })

    it('deletes a session and all its players', async () => {
      const session = await store.createSession('host-1', 'qs-1')

      const player: Player = {
        playerId: 'player-1',
        nickname: 'Alice',
        socketId: 'socket-1',
        score: 0,
        connected: true,
        lastAnswerIndex: null,
        lastAnswerTime: null, lastSpellingAnswer: null,
        coinsEarned: 0, streak: 0,
      }
      await store.addPlayer(session.sessionId, player)

      await store.deleteSession(session.sessionId)

      expect(await store.getSession(session.sessionId)).toBeNull()
      expect(await store.getSessionByCode(session.roomCode)).toBeNull()
      expect(await store.getPlayers(session.sessionId)).toEqual([])
    })

    it('deleting non-existent session is a no-op', async () => {
      // Should not throw
      await store.deleteSession('non-existent')
    })
  })

  describe('Player Operations', () => {
    let sessionId: string

    beforeEach(async () => {
      const session = await store.createSession('host-1', 'qs-1')
      sessionId = session.sessionId
    })

    const createTestPlayer = (id: string, nickname: string): Player => ({
      playerId: id,
      nickname,
      socketId: `socket-${id}`,
      score: 0,
      connected: true,
      lastAnswerIndex: null,
      lastAnswerTime: null, lastSpellingAnswer: null,
      coinsEarned: 0, streak: 0,
    })

    it('adds a player to a session', async () => {
      const player = createTestPlayer('p1', 'Alice')
      await store.addPlayer(sessionId, player)

      const players = await store.getPlayers(sessionId)
      expect(players).toHaveLength(1)
      expect(players[0]).toEqual(player)
    })

    it('adds multiple players to a session', async () => {
      await store.addPlayer(sessionId, createTestPlayer('p1', 'Alice'))
      await store.addPlayer(sessionId, createTestPlayer('p2', 'Bob'))
      await store.addPlayer(sessionId, createTestPlayer('p3', 'Charlie'))

      const players = await store.getPlayers(sessionId)
      expect(players).toHaveLength(3)
    })

    it('throws when adding player to non-existent session', async () => {
      await expect(
        store.addPlayer('non-existent', createTestPlayer('p1', 'Alice'))
      ).rejects.toThrow('Session not found')
    })

    it('throws when adding duplicate player ID', async () => {
      await store.addPlayer(sessionId, createTestPlayer('p1', 'Alice'))

      await expect(
        store.addPlayer(sessionId, createTestPlayer('p1', 'Different Name'))
      ).rejects.toThrow('Player already exists')
    })

    it('retrieves a specific player', async () => {
      const player = createTestPlayer('p1', 'Alice')
      await store.addPlayer(sessionId, player)

      const retrieved = await store.getPlayer(sessionId, 'p1')
      expect(retrieved).toEqual(player)
    })

    it('returns null for non-existent player', async () => {
      const result = await store.getPlayer(sessionId, 'non-existent')
      expect(result).toBeNull()
    })

    it('returns null for player in non-existent session', async () => {
      const result = await store.getPlayer('non-existent', 'p1')
      expect(result).toBeNull()
    })

    it('updates player properties', async () => {
      await store.addPlayer(sessionId, createTestPlayer('p1', 'Alice'))

      await store.updatePlayer(sessionId, 'p1', {
        score: 100,
        connected: false,
        lastAnswerIndex: 2,
        lastAnswerTime: Date.now(),
      })

      const updated = await store.getPlayer(sessionId, 'p1')
      expect(updated?.score).toBe(100)
      expect(updated?.connected).toBe(false)
      expect(updated?.lastAnswerIndex).toBe(2)

      // Other fields unchanged
      expect(updated?.nickname).toBe('Alice')
    })

    it('throws when updating player in non-existent session', async () => {
      await expect(
        store.updatePlayer('non-existent', 'p1', { score: 100 })
      ).rejects.toThrow('Session not found')
    })

    it('throws when updating non-existent player', async () => {
      await expect(
        store.updatePlayer(sessionId, 'non-existent', { score: 100 })
      ).rejects.toThrow('Player not found')
    })

    it('removes a player from a session', async () => {
      await store.addPlayer(sessionId, createTestPlayer('p1', 'Alice'))
      await store.addPlayer(sessionId, createTestPlayer('p2', 'Bob'))

      await store.removePlayer(sessionId, 'p1')

      const players = await store.getPlayers(sessionId)
      expect(players).toHaveLength(1)
      expect(players[0].nickname).toBe('Bob')
    })

    it('removing non-existent player is a no-op', async () => {
      // Should not throw
      await store.removePlayer(sessionId, 'non-existent')
    })

    it('returns empty array for non-existent session', async () => {
      const players = await store.getPlayers('non-existent')
      expect(players).toEqual([])
    })
  })

  describe('Utility Operations', () => {
    it('clears all data', async () => {
      await store.createSession('host-1', 'qs-1')
      await store.createSession('host-2', 'qs-2')

      await store.clear()

      expect(store.getStats()).toEqual({ sessions: 0, totalPlayers: 0 })
    })

    it('reports correct stats', async () => {
      const s1 = await store.createSession('host-1', 'qs-1')
      const s2 = await store.createSession('host-2', 'qs-2')

      await store.addPlayer(s1.sessionId, {
        playerId: 'p1',
        nickname: 'Alice',
        socketId: 'socket-1',
        score: 0,
        connected: true,
        lastAnswerIndex: null,
        lastAnswerTime: null, lastSpellingAnswer: null,
        coinsEarned: 0, streak: 0,
      })
      await store.addPlayer(s1.sessionId, {
        playerId: 'p2',
        nickname: 'Bob',
        socketId: 'socket-2',
        score: 0,
        connected: true,
        lastAnswerIndex: null,
        lastAnswerTime: null, lastSpellingAnswer: null,
        coinsEarned: 0, streak: 0,
      })
      await store.addPlayer(s2.sessionId, {
        playerId: 'p3',
        nickname: 'Charlie',
        socketId: 'socket-3',
        score: 0,
        connected: true,
        lastAnswerIndex: null,
        lastAnswerTime: null, lastSpellingAnswer: null,
        coinsEarned: 0, streak: 0,
      })

      expect(store.getStats()).toEqual({ sessions: 2, totalPlayers: 3 })
    })
  })
})
