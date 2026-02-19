/**
 * Redis Session Store
 *
 * Production-ready session storage using Redis.
 *
 * Why Redis for production?
 * 1. Persistence: Data survives server restarts
 * 2. Shared state: Multiple server instances share the same sessions
 * 3. Performance: Redis is incredibly fast (in-memory with optional persistence)
 * 4. TTL support: Sessions auto-expire after inactivity
 *
 * Key Structure:
 * - session:{sessionId} → JSON string of LiveSession
 * - session:players:{sessionId} → Redis Hash of playerId → JSON string of Player
 * - roomcode:{roomCode} → sessionId (for lookup by room code)
 *
 * All keys have a TTL (time-to-live) so abandoned sessions auto-delete.
 */

import Redis from 'ioredis'
import type { SessionStore, LiveSession, Player, Phase, GameType } from './types'
import { config } from '../config'

// Key prefixes - makes it easy to find/debug keys in Redis
const KEYS = {
  session: (id: string) => `session:${id}`,
  players: (id: string) => `session:players:${id}`,
  roomCode: (code: string) => `roomcode:${code.toUpperCase()}`,
}

// Session TTL: 24 hours (sessions auto-delete after this)
const SESSION_TTL_SECONDS = 24 * 60 * 60

/**
 * Generate a random UUID.
 */
function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Generate a 6-character room code.
 */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * Redis implementation of SessionStore.
 *
 * Each session is stored as a JSON string, with a separate Hash
 * for players (allows individual player updates without re-serializing all).
 */
export class RedisSessionStore implements SessionStore {
  private redis: Redis

  constructor(redisUrl?: string) {
    // Use provided URL or fall back to config
    const url = redisUrl || config.redisUrl

    if (!url) {
      throw new Error('Redis URL is required for RedisSessionStore')
    }

    this.redis = new Redis(url, {
      // Reconnection settings
      retryStrategy: (times) => {
        // Wait progressively longer between retries, max 30 seconds
        return Math.min(times * 1000, 30000)
      },
      maxRetriesPerRequest: 3,
    })

    // Log connection events
    this.redis.on('connect', () => {
      console.log('📦 Redis session store connected')
    })

    this.redis.on('error', (err) => {
      console.error('📦 Redis session store error:', err.message)
    })
  }

  // === Session Operations ===

  async createSession(hostSocketId: string, questionSetId: string, gameType: GameType = 'quiz'): Promise<LiveSession> {
    const sessionId = generateId()

    // Generate unique room code (retry if collision)
    let roomCode: string
    let attempts = 0
    const maxAttempts = 10

    do {
      roomCode = generateRoomCode()
      // Check if room code already exists
      const existing = await this.redis.exists(KEYS.roomCode(roomCode))
      if (!existing) break
      attempts++
    } while (attempts < maxAttempts)

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique room code')
    }

    const session: LiveSession = {
      sessionId,
      roomCode,
      hostSocketId,
      questionSetId,
      gameType,
      phase: 'LOBBY' as Phase,
      currentQuestionIndex: 0,
      questionStartedAt: null,
      createdAt: Date.now(),
      hostConnected: true,
      hostDisconnectedAt: null,
    }

    // Use a pipeline (batch) for atomic operations
    // Pipeline sends all commands at once, reducing network round trips
    const pipeline = this.redis.pipeline()

    // Store session
    pipeline.set(KEYS.session(sessionId), JSON.stringify(session), 'EX', SESSION_TTL_SECONDS)

    // Map room code to session ID
    pipeline.set(KEYS.roomCode(roomCode), sessionId, 'EX', SESSION_TTL_SECONDS)

    // Execute all commands atomically
    await pipeline.exec()

    return session
  }

  async getSession(sessionId: string): Promise<LiveSession | null> {
    const data = await this.redis.get(KEYS.session(sessionId))
    if (!data) return null

    return JSON.parse(data) as LiveSession
  }

  async getSessionByCode(roomCode: string): Promise<LiveSession | null> {
    // Look up session ID from room code
    const sessionId = await this.redis.get(KEYS.roomCode(roomCode.toUpperCase()))
    if (!sessionId) return null

    return this.getSession(sessionId)
  }

  async updateSession(sessionId: string, updates: Partial<LiveSession>): Promise<void> {
    // Get current session
    const session = await this.getSession(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    // Merge updates
    const updated = { ...session, ...updates }

    // Store updated session (refresh TTL)
    await this.redis.set(KEYS.session(sessionId), JSON.stringify(updated), 'EX', SESSION_TTL_SECONDS)

    // Also refresh room code TTL
    await this.redis.expire(KEYS.roomCode(session.roomCode), SESSION_TTL_SECONDS)
  }

  async deleteSession(sessionId: string): Promise<void> {
    // Get session to find room code
    const session = await this.getSession(sessionId)
    if (!session) return

    // Delete all related keys
    const pipeline = this.redis.pipeline()
    pipeline.del(KEYS.session(sessionId))
    pipeline.del(KEYS.players(sessionId))
    pipeline.del(KEYS.roomCode(session.roomCode))
    await pipeline.exec()
  }

  // === Player Operations ===

  async addPlayer(sessionId: string, player: Player): Promise<void> {
    // Verify session exists
    const session = await this.getSession(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    // Check if player already exists
    const exists = await this.redis.hexists(KEYS.players(sessionId), player.playerId)
    if (exists) {
      throw new Error(`Player already exists: ${player.playerId}`)
    }

    // Add player to hash
    await this.redis.hset(KEYS.players(sessionId), player.playerId, JSON.stringify(player))

    // Refresh TTL
    await this.redis.expire(KEYS.players(sessionId), SESSION_TTL_SECONDS)
  }

  async getPlayers(sessionId: string): Promise<Player[]> {
    // Get all players from hash
    const playersHash = await this.redis.hgetall(KEYS.players(sessionId))

    // Convert hash values (JSON strings) to Player objects
    return Object.values(playersHash).map((data) => JSON.parse(data) as Player)
  }

  async getPlayer(sessionId: string, playerId: string): Promise<Player | null> {
    const data = await this.redis.hget(KEYS.players(sessionId), playerId)
    if (!data) return null

    return JSON.parse(data) as Player
  }

  async updatePlayer(sessionId: string, playerId: string, updates: Partial<Player>): Promise<void> {
    // Get current player
    const player = await this.getPlayer(sessionId, playerId)
    if (!player) {
      // Check if session exists to give better error message
      const session = await this.getSession(sessionId)
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`)
      }
      throw new Error(`Player not found: ${playerId}`)
    }

    // Merge updates
    const updated = { ...player, ...updates }

    // Store updated player
    await this.redis.hset(KEYS.players(sessionId), playerId, JSON.stringify(updated))

    // Refresh TTL
    await this.redis.expire(KEYS.players(sessionId), SESSION_TTL_SECONDS)
  }

  async removePlayer(sessionId: string, playerId: string): Promise<void> {
    await this.redis.hdel(KEYS.players(sessionId), playerId)
  }

  // === Utility ===

  async clear(): Promise<void> {
    // WARNING: This deletes ALL session data!
    // Only use for testing

    // Find and delete all session-related keys
    const sessionKeys = await this.redis.keys('session:*')
    const roomCodeKeys = await this.redis.keys('roomcode:*')

    const allKeys = [...sessionKeys, ...roomCodeKeys]

    if (allKeys.length > 0) {
      await this.redis.del(...allKeys)
    }
  }

  /**
   * Close the Redis connection.
   * Call this when shutting down the server.
   */
  async disconnect(): Promise<void> {
    await this.redis.quit()
  }

  /**
   * Get connection status.
   */
  isConnected(): boolean {
    return this.redis.status === 'ready'
  }

  /**
   * Get stats for debugging.
   */
  async getStats(): Promise<{ sessions: number; totalPlayers: number }> {
    const sessionKeys = await this.redis.keys('session:*')
    // Filter to only actual session keys (not player hashes)
    const sessionCount = sessionKeys.filter((k) => !k.includes(':players:')).length

    let totalPlayers = 0
    for (const key of sessionKeys.filter((k) => k.includes(':players:'))) {
      const count = await this.redis.hlen(key)
      totalPlayers += count
    }

    return { sessions: sessionCount, totalPlayers }
  }
}
