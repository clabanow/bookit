/**
 * Disconnect Handler Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { getSessionStore, resetSessionStore, createPlayer } from '@/lib/session'

describe('Disconnect Handling', () => {
  beforeEach(() => {
    resetSessionStore()
  })

  describe('Player disconnect flow', () => {
    it('marks player as disconnected when they leave', async () => {
      const store = getSessionStore()

      // Create a session and add a player
      const session = await store.createSession('host-socket-1', 'qs-1')
      const player = createPlayer('player-1', 'Alice', 'player-socket-1')
      await store.addPlayer(session.sessionId, player)

      // Verify player is connected
      let players = await store.getPlayers(session.sessionId)
      expect(players[0].connected).toBe(true)

      // Simulate disconnect by updating player status
      await store.updatePlayer(session.sessionId, player.playerId, {
        connected: false,
      })

      // Verify player is now disconnected
      players = await store.getPlayers(session.sessionId)
      expect(players[0].connected).toBe(false)
      expect(players[0].nickname).toBe('Alice') // Player still exists
    })

    it('keeps player data when disconnected (for reconnection)', async () => {
      const store = getSessionStore()

      // Create session with player who has a score
      const session = await store.createSession('host-socket-1', 'qs-1')
      const player = createPlayer('player-1', 'Alice', 'player-socket-1')
      await store.addPlayer(session.sessionId, player)

      // Give player some score
      await store.updatePlayer(session.sessionId, player.playerId, {
        score: 500,
      })

      // Disconnect
      await store.updatePlayer(session.sessionId, player.playerId, {
        connected: false,
      })

      // Verify score is preserved
      const disconnectedPlayer = await store.getPlayer(session.sessionId, player.playerId)
      expect(disconnectedPlayer?.score).toBe(500)
      expect(disconnectedPlayer?.connected).toBe(false)
    })

    it('correctly counts connected vs total players', async () => {
      const store = getSessionStore()

      const session = await store.createSession('host-socket-1', 'qs-1')

      // Add 3 players
      await store.addPlayer(session.sessionId, createPlayer('p1', 'Alice', 's1'))
      await store.addPlayer(session.sessionId, createPlayer('p2', 'Bob', 's2'))
      await store.addPlayer(session.sessionId, createPlayer('p3', 'Charlie', 's3'))

      // Disconnect one
      await store.updatePlayer(session.sessionId, 'p2', { connected: false })

      const players = await store.getPlayers(session.sessionId)
      const connectedCount = players.filter((p) => p.connected).length

      expect(players.length).toBe(3) // Total
      expect(connectedCount).toBe(2) // Connected
    })
  })

  describe('Finding player by socket ID', () => {
    it('can find player by their socket ID', async () => {
      const store = getSessionStore()

      const session = await store.createSession('host-socket-1', 'qs-1')
      await store.addPlayer(session.sessionId, createPlayer('p1', 'Alice', 'socket-alice'))
      await store.addPlayer(session.sessionId, createPlayer('p2', 'Bob', 'socket-bob'))

      const players = await store.getPlayers(session.sessionId)
      const alice = players.find((p) => p.socketId === 'socket-alice')

      expect(alice).toBeDefined()
      expect(alice?.nickname).toBe('Alice')
    })
  })
})
