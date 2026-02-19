/**
 * In-Memory Session Store
 *
 * This implementation stores all game data in JavaScript Maps.
 * Perfect for development because:
 * - No external dependencies (no Redis to install)
 * - Fast (everything in memory)
 * - Easy to debug (can inspect with console.log)
 *
 * Trade-off: Data is lost when the server restarts.
 * That's fine for dev, but production uses Redis.
 */

import type { SessionStore, LiveSession, Player, Phase, GameType } from './types'

/**
 * Generate a random UUID.
 *
 * UUIDs (Universally Unique Identifiers) are random strings that are
 * statistically guaranteed to be unique. We use them for session and player IDs.
 */
function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Generate a 6-character room code.
 *
 * Room codes are what players type to join a game. They need to be:
 * - Short (easy to type/say aloud)
 * - Unambiguous (no 0/O, 1/I confusion)
 * - Random enough that you can't guess active rooms
 */
function generateRoomCode(): string {
  // Characters that are easy to read and type (no 0/O, 1/I/L confusion)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * In-memory implementation of SessionStore.
 *
 * Uses two Maps:
 * - sessions: sessionId → LiveSession
 * - players: sessionId → Map<playerId, Player>
 *
 * We also maintain a roomCode → sessionId index for fast lookups.
 */
export class MemorySessionStore implements SessionStore {
  // Main storage
  private sessions = new Map<string, LiveSession>()
  private players = new Map<string, Map<string, Player>>()

  // Index for room code lookups
  private roomCodeIndex = new Map<string, string>()

  // === Session Operations ===

  async createSession(hostSocketId: string, questionSetId: string, gameType: GameType = 'quiz'): Promise<LiveSession> {
    const sessionId = generateId()

    // Generate a unique room code (retry if collision)
    let roomCode: string
    do {
      roomCode = generateRoomCode()
    } while (this.roomCodeIndex.has(roomCode))

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

    // Store session and update index
    this.sessions.set(sessionId, session)
    this.roomCodeIndex.set(roomCode, sessionId)
    this.players.set(sessionId, new Map())

    return session
  }

  async getSession(sessionId: string): Promise<LiveSession | null> {
    return this.sessions.get(sessionId) ?? null
  }

  async getSessionByCode(roomCode: string): Promise<LiveSession | null> {
    const sessionId = this.roomCodeIndex.get(roomCode.toUpperCase())
    if (!sessionId) return null
    return this.getSession(sessionId)
  }

  async updateSession(sessionId: string, updates: Partial<LiveSession>): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    // Merge updates into existing session
    // Object spread creates a new object with old values overwritten by new ones
    const updated = { ...session, ...updates }
    this.sessions.set(sessionId, updated)
  }

  async deleteSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      // Clean up all references
      this.roomCodeIndex.delete(session.roomCode)
      this.players.delete(sessionId)
      this.sessions.delete(sessionId)
    }
  }

  // === Player Operations ===

  async addPlayer(sessionId: string, player: Player): Promise<void> {
    const sessionPlayers = this.players.get(sessionId)
    if (!sessionPlayers) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    if (sessionPlayers.has(player.playerId)) {
      throw new Error(`Player already exists: ${player.playerId}`)
    }

    sessionPlayers.set(player.playerId, player)
  }

  async getPlayers(sessionId: string): Promise<Player[]> {
    const sessionPlayers = this.players.get(sessionId)
    if (!sessionPlayers) return []

    // Convert Map values to array
    return Array.from(sessionPlayers.values())
  }

  async getPlayer(sessionId: string, playerId: string): Promise<Player | null> {
    const sessionPlayers = this.players.get(sessionId)
    if (!sessionPlayers) return null

    return sessionPlayers.get(playerId) ?? null
  }

  async updatePlayer(
    sessionId: string,
    playerId: string,
    updates: Partial<Player>
  ): Promise<void> {
    const sessionPlayers = this.players.get(sessionId)
    if (!sessionPlayers) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    const player = sessionPlayers.get(playerId)
    if (!player) {
      throw new Error(`Player not found: ${playerId}`)
    }

    // Merge updates into existing player
    const updated = { ...player, ...updates }
    sessionPlayers.set(playerId, updated)
  }

  async removePlayer(sessionId: string, playerId: string): Promise<void> {
    const sessionPlayers = this.players.get(sessionId)
    if (sessionPlayers) {
      sessionPlayers.delete(playerId)
    }
  }

  // === Utility ===

  async clear(): Promise<void> {
    this.sessions.clear()
    this.players.clear()
    this.roomCodeIndex.clear()
  }

  // Debug helper - not part of interface
  getStats(): { sessions: number; totalPlayers: number } {
    let totalPlayers = 0
    for (const players of this.players.values()) {
      totalPlayers += players.size
    }
    return {
      sessions: this.sessions.size,
      totalPlayers,
    }
  }
}
