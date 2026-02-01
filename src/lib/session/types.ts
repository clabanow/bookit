/**
 * Session Store Types
 *
 * These types define the shape of game sessions and players.
 * They're used by both the in-memory store (dev) and Redis store (prod).
 *
 * Key concept: "Ephemeral" vs "Persistent" data
 * - Ephemeral: Lives only while game is active (sessions, players, scores)
 * - Persistent: Saved forever in database (question sets, user accounts)
 *
 * Sessions are ephemeral - when a game ends, the session is deleted.
 */

/**
 * Game phases - the states a game can be in.
 *
 * The game progresses through these phases in order:
 * LOBBY → COUNTDOWN → QUESTION → REVEAL → LEADERBOARD → (repeat) → END
 */
export type Phase =
  | 'LOBBY' // Waiting for players to join
  | 'COUNTDOWN' // 3-2-1 before first question
  | 'QUESTION' // Players are answering
  | 'REVEAL' // Showing the correct answer
  | 'LEADERBOARD' // Showing current standings
  | 'END' // Game is over

/**
 * A live game session.
 *
 * This contains all the state needed to run a single game.
 * One session = one game room with one host and multiple players.
 */
export interface LiveSession {
  /** Unique identifier for this session (UUID) */
  sessionId: string

  /** 6-character code players use to join (e.g., "ABC123") */
  roomCode: string

  /** Socket ID of the host - used to verify host actions */
  hostSocketId: string

  /** ID of the question set being used (references Postgres) */
  questionSetId: string

  /** Current game phase */
  phase: Phase

  /** Index of the current question (0-based) */
  currentQuestionIndex: number

  /** Timestamp when the current question started (for timing answers) */
  questionStartedAt: number | null

  /** When this session was created */
  createdAt: number

  /** Whether the host is currently connected */
  hostConnected: boolean

  /** When the host disconnected (for grace period timeout) */
  hostDisconnectedAt: number | null
}

/**
 * A player in a game session.
 *
 * Players are stored separately from the session so we can
 * efficiently update individual player state (scores, answers).
 */
export interface Player {
  /** Unique identifier for this player (UUID) */
  playerId: string

  /** Display name chosen by the player */
  nickname: string

  /** Current socket ID - changes if player reconnects */
  socketId: string

  /** Current score (points earned from correct answers) */
  score: number

  /** Whether the player is currently connected */
  connected: boolean

  /** Answer submitted for multiple choice questions (null if not answered) */
  lastAnswerIndex: number | null

  /** Typed answer for spelling questions (null if not answered) */
  lastSpellingAnswer: string | null

  /** Timestamp when the answer was submitted (for speed bonus) */
  lastAnswerTime: number | null
}

/**
 * The SessionStore interface.
 *
 * This is the "contract" that any session store implementation must follow.
 * By coding to this interface (not to a specific implementation), we can
 * swap out the underlying storage without changing any other code.
 *
 * All methods are async (return Promises) because Redis operations are async.
 * Even though in-memory operations are sync, we use async for consistency.
 */
export interface SessionStore {
  // === Session Operations ===

  /**
   * Create a new game session.
   * Generates a unique sessionId and roomCode automatically.
   */
  createSession(hostSocketId: string, questionSetId: string): Promise<LiveSession>

  /**
   * Get a session by its ID.
   * Returns null if session doesn't exist or has expired.
   */
  getSession(sessionId: string): Promise<LiveSession | null>

  /**
   * Get a session by its room code.
   * Used when players join with a code.
   */
  getSessionByCode(roomCode: string): Promise<LiveSession | null>

  /**
   * Update session properties.
   * Only updates the fields provided in `updates`.
   */
  updateSession(sessionId: string, updates: Partial<LiveSession>): Promise<void>

  /**
   * Delete a session and all its players.
   * Called when game ends or host disconnects permanently.
   */
  deleteSession(sessionId: string): Promise<void>

  // === Player Operations ===

  /**
   * Add a player to a session.
   * Throws if session doesn't exist or player ID already exists.
   */
  addPlayer(sessionId: string, player: Player): Promise<void>

  /**
   * Get all players in a session.
   * Returns empty array if session doesn't exist.
   */
  getPlayers(sessionId: string): Promise<Player[]>

  /**
   * Get a specific player from a session.
   * Returns null if session or player doesn't exist.
   */
  getPlayer(sessionId: string, playerId: string): Promise<Player | null>

  /**
   * Update player properties.
   * Only updates the fields provided in `updates`.
   */
  updatePlayer(sessionId: string, playerId: string, updates: Partial<Player>): Promise<void>

  /**
   * Remove a player from a session.
   * Called when player leaves or is kicked.
   */
  removePlayer(sessionId: string, playerId: string): Promise<void>

  // === Utility ===

  /**
   * Clear all sessions (useful for testing).
   */
  clear(): Promise<void>
}
