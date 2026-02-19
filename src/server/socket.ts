/**
 * Socket.IO Server Setup
 *
 * This module configures the Socket.IO server and defines connection handling.
 * Socket.IO is attached to an existing HTTP server (shared with Next.js).
 *
 * Key concepts:
 * - Namespace: A communication channel (we use the default "/" namespace)
 * - Room: A subset of connected clients that can receive messages together
 * - Socket: A single client connection with a unique ID
 */

import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import { registerHostHandlers, registerPlayerHandlers, registerChatHandlers, handleDisconnect } from '@/lib/realtime/handlers'
import { config } from '@/lib/config'

// Re-export types that handlers will need
export type { Server, Socket }

/**
 * Creates and configures the Socket.IO server.
 *
 * We attach it to the existing HTTP server so that:
 * 1. Both Next.js and Socket.IO share the same port (simpler deployment)
 * 2. WebSocket upgrade requests go to Socket.IO, regular HTTP to Next.js
 */
export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    // CORS configuration - uses centralized config
    // In production, corsOrigin should be set to specific domains
    cors: {
      origin: config.corsOrigin || false,
      methods: ['GET', 'POST'],
    },

    // Connection settings
    pingTimeout: 60000, // How long to wait for a pong before considering connection dead
    pingInterval: 25000, // How often to ping clients to check they're alive
  })

  // Set up connection handling
  io.on('connection', (socket: Socket) => {
    handleConnection(io, socket)
  })

  console.log('🔌 Socket.IO server initialized')

  return io
}

/**
 * Handle a new socket connection.
 *
 * This is called every time a client connects. We'll:
 * 1. Log the connection
 * 2. Set up event listeners for this socket
 * 3. Handle disconnection
 */
function handleConnection(io: Server, socket: Socket): void {
  const { role } = socket.handshake.query as {
    role?: string
    sessionId?: string
    playerId?: string
  }

  console.log(`📥 Client connected: ${socket.id} (role: ${role || 'unknown'})`)

  // Acknowledge the connection - clients can listen for this to confirm they're connected
  socket.emit('connected', {
    socketId: socket.id,
    timestamp: Date.now(),
  })

  // Register chat handlers for ALL connections (hosts and players can both chat)
  registerChatHandlers(io, socket)

  // Register role-specific event handlers
  if (role === 'host') {
    registerHostHandlers(io, socket)
  } else if (role === 'player') {
    registerPlayerHandlers(io, socket)
  }

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`📤 Client disconnected: ${socket.id} (reason: ${reason})`)
    handleDisconnect(io, socket).catch((err) => {
      console.error('Error handling disconnect:', err)
    })
  })

  // Simple ping/pong for testing connection
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() })
  })
}

/**
 * Type definitions for Socket.IO events
 *
 * These match the REALTIME_PROTOCOL.md specification.
 * We define them here so both server and client can share them.
 */

// Events that clients can send to the server
export interface ClientToServerEvents {
  ping: () => void
  'host:create_room': (data: { questionSetId: string; gameType?: string }) => void
  'host:reconnect': (data: { sessionId: string }) => void
  'host:start_game': (data: { sessionId: string }) => void
  'host:advance_game': (data: { sessionId: string }) => void
  'host:show_leaderboard': (data: { sessionId: string }) => void
  'host:next_question': (data: { sessionId: string }) => void
  'host:end_game': (data: { sessionId: string }) => void
  'host:kick_player': (data: { sessionId: string; playerId: string }) => void
  'player:join_room': (data: { roomCode: string; nickname: string }) => void
  'player:submit_answer': (data: {
    sessionId: string
    answerIndex: number
  }) => void
  'player:submit_kick': (data: { sessionId: string; direction: string }) => void
  'player:reconnect': (data: { sessionId: string; playerId: string }) => void
  'chat:join_channel': (data: { channel: string }) => void
  'chat:leave_channel': (data: { channel: string }) => void
  'chat:send': (data: {
    channel: string
    content: string
    playerId: string
    userId: string
    nickname: string
  }) => void
}

// Events that the server can send to clients
export interface ServerToClientEvents {
  connected: (data: { socketId: string; timestamp: number }) => void
  pong: (data: { timestamp: number }) => void
  error: (data: { code: string; message: string; details?: unknown }) => void
  'room:created': (data: { sessionId: string; roomCode: string }) => void
  'room:roster_update': (data: {
    players: Array<{
      playerId: string
      nickname: string
      connected: boolean
    }>
    count: number
  }) => void
  'player:joined': (data: {
    sessionId: string
    playerId: string
    players: Array<{
      playerId: string
      nickname: string
      connected: boolean
    }>
  }) => void
  'player:answer_confirmed': (data: { answerIndex: number; timestamp: number }) => void
  'player:kick_confirmed': (data: { direction: string }) => void
  'host:disconnected': (data: { message: string; timestamp: number }) => void
  'host:connected': (data: { message: string; timestamp: number }) => void
  'player:kicked': (data: { playerId: string; reason: string }) => void
  'host:reconnected': (data: {
    sessionId: string
    roomCode: string
    gameType: string
    phase: string
    currentQuestionIndex: number
    players: Array<{
      playerId: string
      nickname: string
      connected: boolean
    }>
  }) => void
  'player:state_sync': (data: {
    phase: string
    currentQuestion?: {
      questionIndex: number
      totalQuestions: number
      prompt: string
      options: string[]
      timeLimitSec: number
    } | null
    timeRemaining?: number | null
    score: number
    leaderboard?: Array<{
      playerId: string
      nickname: string
      score: number
    }>
    hasAnswered?: boolean
    selectedAnswer?: number | null
  }) => void
  'game:phase_update': (data: { phase: string; timestamp: number }) => void
  'game:countdown': (data: {
    phase: string
    duration: number
    totalQuestions?: number
    questionIndex?: number
  }) => void
  'game:question': (data: {
    phase: string
    questionIndex: number
    totalQuestions: number
    prompt: string
    options: string[]
    timeLimitSec: number
    startedAt: number
  }) => void
  'game:reveal': (data: {
    phase: string
    questionIndex: number
    correctIndex: number
    results: Array<{
      playerId: string
      nickname: string
      answerIndex: number | null
      isCorrect: boolean
      points: number
      totalScore: number
    }>
  }) => void
  'game:penalty_kick': (data: {
    phase: string
    questionIndex: number
    results: Array<{
      playerId: string
      nickname: string
      isCorrect: boolean
    }>
    timeoutMs: number
  }) => void
  'game:leaderboard': (data: {
    phase: string
    questionIndex: number
    totalQuestions: number
    isLastQuestion: boolean
    leaderboard: Array<{
      playerId: string
      nickname: string
      score: number
    }>
  }) => void
  'game:end': (data: {
    phase: string
    finalStandings: Array<{
      playerId: string
      nickname: string
      score: number
    }>
  }) => void
  'chat:message': (data: {
    id: string
    playerId: string
    nickname: string
    content: string
    createdAt: string
    channel: string
  }) => void
}
