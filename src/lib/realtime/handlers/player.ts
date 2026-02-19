/**
 * Player Event Handlers
 *
 * These functions handle Socket.IO events from player clients.
 * Players can:
 * - Join rooms
 * - Submit answers
 * - Reconnect to active games
 */

import type { Server, Socket } from 'socket.io'
import { getSessionStore, createPlayer } from '@/lib/session'
import { prisma } from '@/lib/db'
import { validateNickname, sanitizeNickname } from '@/lib/validation/nickname'
import { validateRoomCode, validateAnswerIndex } from '@/lib/validation/schemas'
import { checkRateLimit } from '@/lib/middleware/rateLimit'
import { handlePlayerReconnect } from './reconnect'
import { resolvePenalties } from './game'

/**
 * Error codes for player operations.
 */
export const PlayerErrorCodes = {
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  GAME_IN_PROGRESS: 'GAME_IN_PROGRESS',
  NICKNAME_TAKEN: 'NICKNAME_TAKEN',
  NICKNAME_INVALID: 'NICKNAME_INVALID',
  ROOM_FULL: 'ROOM_FULL',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_INPUT: 'INVALID_INPUT',
} as const

const MAX_PLAYERS = 50 // Maximum players per room

/**
 * Register all player event handlers on a socket.
 *
 * @param io - The Socket.IO server (for broadcasting)
 * @param socket - The player's socket connection
 */
export function registerPlayerHandlers(io: Server, socket: Socket): void {
  /**
   * Handle player join request.
   *
   * When a player emits 'player:join_room', we:
   * 1. Validate the room code exists
   * 2. Check game hasn't started
   * 3. Validate and check nickname uniqueness
   * 4. Add player to session
   * 5. Broadcast roster update to all clients in room
   */
  socket.on('player:join_room', async (data: { roomCode: string; nickname: string }) => {
    try {
      const { roomCode, nickname } = data

      // 0. Rate limiting - prevent spam join attempts
      const rateLimit = checkRateLimit(socket.id, 'joinRoom')
      if (!rateLimit.allowed) {
        socket.emit('error', {
          code: PlayerErrorCodes.RATE_LIMITED,
          message: rateLimit.message || 'Too many attempts. Please wait.',
          details: { retryAfter: rateLimit.retryAfter },
        })
        return
      }

      // 0b. Validate room code format
      const roomCodeValidation = validateRoomCode(roomCode)
      if (!roomCodeValidation.valid) {
        socket.emit('error', {
          code: PlayerErrorCodes.INVALID_INPUT,
          message: roomCodeValidation.error || 'Invalid room code format',
        })
        return
      }

      const store = getSessionStore()

      // 1. Find the room (use sanitized room code)
      const session = await store.getSessionByCode(roomCodeValidation.sanitized!)
      if (!session) {
        socket.emit('error', {
          code: PlayerErrorCodes.ROOM_NOT_FOUND,
          message: 'Room not found. Check the code and try again.',
        })
        return
      }

      // 2. Check game phase - can only join during LOBBY
      if (session.phase !== 'LOBBY') {
        socket.emit('error', {
          code: PlayerErrorCodes.GAME_IN_PROGRESS,
          message: 'Game has already started. Wait for the next round.',
        })
        return
      }

      // 3. Validate nickname
      const validation = validateNickname(nickname)
      if (!validation.valid) {
        socket.emit('error', {
          code: PlayerErrorCodes.NICKNAME_INVALID,
          message: validation.error || 'Invalid nickname',
        })
        return
      }

      const sanitizedNickname = sanitizeNickname(nickname)

      // 4. Check nickname uniqueness in this room
      const existingPlayers = await store.getPlayers(session.sessionId)

      if (existingPlayers.length >= MAX_PLAYERS) {
        socket.emit('error', {
          code: PlayerErrorCodes.ROOM_FULL,
          message: 'Room is full. Maximum 50 players.',
        })
        return
      }

      const nicknameTaken = existingPlayers.some(
        (p) => p.nickname.toLowerCase() === sanitizedNickname.toLowerCase()
      )
      if (nicknameTaken) {
        socket.emit('error', {
          code: PlayerErrorCodes.NICKNAME_TAKEN,
          message: 'That nickname is already taken. Try another one.',
        })
        return
      }

      // 5. Create and add the player
      const playerId = crypto.randomUUID()
      const player = createPlayer(playerId, sanitizedNickname, socket.id)
      await store.addPlayer(session.sessionId, player)

      // 6. Join the Socket.IO room for this game
      socket.join(session.sessionId)

      // 7. Get updated player list
      const allPlayers = await store.getPlayers(session.sessionId)
      const playerList = allPlayers.map((p) => ({
        playerId: p.playerId,
        nickname: p.nickname,
        connected: p.connected,
      }))

      // 8. Send confirmation to the joining player
      socket.emit('player:joined', {
        sessionId: session.sessionId,
        playerId,
        players: playerList,
      })

      // 9. Broadcast roster update to everyone in the room (including host)
      io.to(session.sessionId).emit('room:roster_update', {
        players: playerList,
        count: playerList.length,
      })

      console.log(`🎮 Player "${sanitizedNickname}" joined room ${roomCode} (${playerList.length} players)`)
    } catch (error) {
      console.error('Error joining room:', error)
      socket.emit('error', {
        code: 'INTERNAL_ERROR',
        message: 'Failed to join room',
      })
    }
  })

  /**
   * Handle answer submission.
   *
   * When a player submits an answer:
   * 1. Validate they're in a game and it's the QUESTION phase
   * 2. Check they haven't already answered
   * 3. Record their answer and timestamp
   * 4. Send confirmation back
   */
  socket.on('player:submit_answer', async (data: { sessionId: string; answerIndex: number }) => {
    try {
      const { sessionId, answerIndex } = data

      // Rate limiting - prevent answer spam
      const rateLimit = checkRateLimit(socket.id, 'submitAnswer')
      if (!rateLimit.allowed) {
        socket.emit('error', {
          code: PlayerErrorCodes.RATE_LIMITED,
          message: rateLimit.message || 'Too many attempts.',
          details: { retryAfter: rateLimit.retryAfter },
        })
        return
      }

      // Validate answer index using schema validator
      const answerValidation = validateAnswerIndex(answerIndex)
      if (!answerValidation.valid) {
        socket.emit('error', {
          code: 'INVALID_ANSWER',
          message: answerValidation.error || 'Invalid answer selection',
        })
        return
      }

      const store = getSessionStore()

      // Find the session
      const session = await store.getSession(sessionId)
      if (!session) {
        socket.emit('error', {
          code: 'SESSION_NOT_FOUND',
          message: 'Game session not found',
        })
        return
      }

      // Check we're in QUESTION phase
      if (session.phase !== 'QUESTION') {
        socket.emit('error', {
          code: 'INVALID_PHASE',
          message: 'Cannot submit answer right now',
        })
        return
      }

      // Find the player by their socket ID
      const players = await store.getPlayers(sessionId)
      const player = players.find((p) => p.socketId === socket.id)

      if (!player) {
        socket.emit('error', {
          code: 'PLAYER_NOT_FOUND',
          message: 'Player not found in this game',
        })
        return
      }

      // Check if already answered
      if (player.lastAnswerIndex !== null) {
        socket.emit('error', {
          code: 'ALREADY_ANSWERED',
          message: 'You have already submitted an answer',
        })
        return
      }

      // Record the answer
      const answerTime = Date.now()
      await store.updatePlayer(sessionId, player.playerId, {
        lastAnswerIndex: answerIndex,
        lastAnswerTime: answerTime,
      })

      // Send confirmation
      socket.emit('player:answer_confirmed', {
        answerIndex,
        timestamp: answerTime,
      })

      console.log(`📝 Player "${player.nickname}" answered ${answerIndex}`)
    } catch (error) {
      console.error('Error submitting answer:', error)
      socket.emit('error', {
        code: 'INTERNAL_ERROR',
        message: 'Failed to submit answer',
      })
    }
  })

  /**
   * Handle spelling answer submission.
   *
   * For spelling mode questions, players submit a typed word instead of an index.
   */
  socket.on('player:submit_spelling', async (data: { sessionId: string; answer: string }) => {
    try {
      const { sessionId, answer } = data

      // Rate limiting
      const rateLimit = checkRateLimit(socket.id, 'submitAnswer')
      if (!rateLimit.allowed) {
        socket.emit('error', {
          code: PlayerErrorCodes.RATE_LIMITED,
          message: rateLimit.message || 'Too many attempts.',
          details: { retryAfter: rateLimit.retryAfter },
        })
        return
      }

      // Basic validation
      if (!answer || typeof answer !== 'string') {
        socket.emit('error', {
          code: 'INVALID_ANSWER',
          message: 'Answer is required',
        })
        return
      }

      const store = getSessionStore()

      // Find the session
      const session = await store.getSession(sessionId)
      if (!session) {
        socket.emit('error', {
          code: 'SESSION_NOT_FOUND',
          message: 'Game session not found',
        })
        return
      }

      // Check we're in QUESTION phase
      if (session.phase !== 'QUESTION') {
        socket.emit('error', {
          code: 'INVALID_PHASE',
          message: 'Cannot submit answer right now',
        })
        return
      }

      // Find the player
      const players = await store.getPlayers(sessionId)
      const player = players.find((p) => p.socketId === socket.id)

      if (!player) {
        socket.emit('error', {
          code: 'PLAYER_NOT_FOUND',
          message: 'Player not found in this game',
        })
        return
      }

      // Check if already answered
      if (player.lastSpellingAnswer !== null) {
        socket.emit('error', {
          code: 'ALREADY_ANSWERED',
          message: 'You have already submitted an answer',
        })
        return
      }

      // Record the spelling answer
      const answerTime = Date.now()
      await store.updatePlayer(sessionId, player.playerId, {
        lastSpellingAnswer: answer.trim(),
        lastAnswerTime: answerTime,
      })

      // Send confirmation
      socket.emit('player:answer_confirmed', {
        spellingAnswer: answer.trim(),
        timestamp: answerTime,
      })

      console.log(`📝 Player "${player.nickname}" spelled: ${answer}`)
    } catch (error) {
      console.error('Error submitting spelling answer:', error)
      socket.emit('error', {
        code: 'INTERNAL_ERROR',
        message: 'Failed to submit answer',
      })
    }
  })

  /**
   * Handle penalty kick submission (soccer mode).
   *
   * When a player in PENALTY_KICK phase chooses a direction:
   * 1. Validate phase and player state
   * 2. Record the kick direction
   * 3. Check if all correct players have kicked → resolve early
   */
  socket.on('player:submit_kick', async (data: { sessionId: string; direction: string }) => {
    try {
      const { sessionId, direction } = data

      // Validate direction
      const validDirections = ['left', 'center', 'right']
      if (!validDirections.includes(direction)) {
        socket.emit('error', {
          code: 'INVALID_INPUT',
          message: 'Invalid kick direction',
        })
        return
      }

      const store = getSessionStore()
      const session = await store.getSession(sessionId)
      if (!session) {
        socket.emit('error', { code: 'SESSION_NOT_FOUND', message: 'Game session not found' })
        return
      }

      // Must be in PENALTY_KICK phase
      if (session.phase !== 'PENALTY_KICK') {
        socket.emit('error', { code: 'INVALID_PHASE', message: 'Cannot submit kick right now' })
        return
      }

      // Find the player
      const players = await store.getPlayers(sessionId)
      const player = players.find((p) => p.socketId === socket.id)
      if (!player) {
        socket.emit('error', { code: 'PLAYER_NOT_FOUND', message: 'Player not found' })
        return
      }

      // Check if already kicked
      if (player.penaltyDirection !== null) {
        socket.emit('error', { code: 'ALREADY_KICKED', message: 'You already submitted a kick' })
        return
      }

      // Check if player got the quiz right (only correct players can kick)
      if (player.penaltyResult === 'miss') {
        socket.emit('error', { code: 'WRONG_ANSWER', message: 'Wrong answer — auto miss' })
        return
      }

      // Record kick direction
      await store.updatePlayer(sessionId, player.playerId, {
        penaltyDirection: direction as 'left' | 'center' | 'right',
      })

      socket.emit('player:kick_confirmed', { direction })

      console.log(`⚽ Player "${player.nickname}" kicked ${direction}`)

      // Check if all correct players have now kicked → resolve early
      const updatedPlayers = await store.getPlayers(sessionId)
      const correctPlayersWaiting = updatedPlayers.filter(
        (p) => p.penaltyResult !== 'miss' && p.penaltyDirection === null
      )

      if (correctPlayersWaiting.length === 0) {
        // All correct players have kicked — fetch questions and resolve immediately
        const questionSet = await prisma.questionSet.findUnique({
          where: { id: session.questionSetId },
          include: { questions: { orderBy: { order: 'asc' } } },
        })

        if (questionSet) {
          await resolvePenalties(io, sessionId, session.currentQuestionIndex, questionSet.questions)
        }
      }
    } catch (error) {
      console.error('Error submitting kick:', error)
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Failed to submit kick' })
    }
  })

  /**
   * Handle player reconnection.
   *
   * When a player refreshes their browser or loses connection temporarily,
   * they can reconnect using their stored sessionId and playerId.
   */
  socket.on('player:reconnect', async (data: { sessionId: string; playerId: string }) => {
    try {
      await handlePlayerReconnect(io, socket, data.sessionId, data.playerId)
    } catch (error) {
      console.error('Error during reconnect:', error)
      socket.emit('error', {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reconnect',
      })
    }
  })
}
