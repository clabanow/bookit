/**
 * Host Event Handlers
 *
 * These functions handle Socket.IO events from host clients.
 * Hosts can:
 * - Create rooms
 * - Start games
 * - Advance to next question
 * - End games early
 *
 * Each handler follows this pattern:
 * 1. Validate the request
 * 2. Perform the action
 * 3. Emit response/broadcast to room
 * 4. Handle errors gracefully
 */

import type { Server, Socket } from 'socket.io'
import { createRoom, RoomError } from '@/lib/room/create'
import { startGame, advanceGame, showLeaderboard } from './game'
import { getSessionStore } from '@/lib/session'
import { prisma } from '@/lib/db'
import { checkRateLimit } from '@/lib/middleware/rateLimit'

/**
 * Error codes for host operations.
 */
export const HostErrorCodes = {
  RATE_LIMITED: 'RATE_LIMITED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

/**
 * Handle host reconnection to an existing session.
 *
 * When the host refreshes their browser or loses connection,
 * they can reconnect using the stored sessionId.
 */
export async function handleHostReconnect(
  io: Server,
  socket: Socket,
  sessionId: string
): Promise<void> {
  const store = getSessionStore()

  const session = await store.getSession(sessionId)
  if (!session) {
    socket.emit('error', {
      code: 'SESSION_NOT_FOUND',
      message: 'Game session has ended or does not exist',
    })
    return
  }

  // Update host socket ID and mark as connected
  await store.updateSession(sessionId, {
    hostSocketId: socket.id,
    hostConnected: true,
    hostDisconnectedAt: null,
  })

  // Join the Socket.IO room
  socket.join(sessionId)

  console.log(`👑 Host reconnected to room ${session.roomCode}`)

  // Get current players
  const players = await store.getPlayers(sessionId)
  const playerList = players.map((p) => ({
    playerId: p.playerId,
    nickname: p.nickname,
    connected: p.connected,
  }))

  // Send current state to host
  socket.emit('host:reconnected', {
    sessionId: session.sessionId,
    roomCode: session.roomCode,
    phase: session.phase,
    currentQuestionIndex: session.currentQuestionIndex,
    players: playerList,
  })

  // Notify players that host is back
  io.to(sessionId).emit('host:connected', {
    message: 'Host has reconnected!',
    timestamp: Date.now(),
  })

  // Broadcast roster update
  io.to(sessionId).emit('room:roster_update', {
    players: playerList,
    count: playerList.filter((p) => p.connected).length,
  })
}

/**
 * Register all host event handlers on a socket.
 *
 * This is called when a new host connects. We attach listeners
 * for all host-specific events to their socket.
 *
 * @param io - The Socket.IO server (for broadcasting)
 * @param socket - The host's socket connection
 */
export function registerHostHandlers(io: Server, socket: Socket): void {
  /**
   * Handle room creation request.
   *
   * When a host emits 'host:create_room', we:
   * 1. Create a session in the store
   * 2. Join the socket to a Socket.IO room (for broadcasting)
   * 3. Emit the room code back to the host
   */
  socket.on('host:create_room', async (data: { questionSetId: string }) => {
    try {
      const { questionSetId } = data

      // Rate limiting - prevent room creation spam
      const rateLimit = checkRateLimit(socket.id, 'createRoom')
      if (!rateLimit.allowed) {
        socket.emit('error', {
          code: HostErrorCodes.RATE_LIMITED,
          message: rateLimit.message || 'Too many rooms created. Please wait.',
          details: { retryAfter: rateLimit.retryAfter },
        })
        return
      }

      // Create the room in our session store
      const session = await createRoom(socket.id, questionSetId)

      // Join the Socket.IO room
      // Socket.IO rooms let us broadcast to all clients in a game
      // The room name is the sessionId for easy lookup
      socket.join(session.sessionId)

      // Send success response to the host
      socket.emit('room:created', {
        sessionId: session.sessionId,
        roomCode: session.roomCode,
      })

      console.log(`👑 Host ${socket.id} created room ${session.roomCode}`)
    } catch (error) {
      // Send error to client
      if (error instanceof RoomError) {
        socket.emit('error', {
          code: error.code,
          message: error.message,
        })
      } else {
        console.error('Error creating room:', error)
        socket.emit('error', {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create room',
        })
      }
    }
  })

  /**
   * Handle host reconnection.
   *
   * When the host refreshes their browser or loses connection,
   * they can reconnect using the stored sessionId.
   */
  socket.on('host:reconnect', async (data: { sessionId: string }) => {
    try {
      await handleHostReconnect(io, socket, data.sessionId)
    } catch (error) {
      console.error('Error reconnecting host:', error)
      socket.emit('error', {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reconnect',
      })
    }
  })

  /**
   * Handle game start request.
   *
   * When the host clicks "Start Game", we begin the countdown
   * and then transition to the first question.
   */
  socket.on('host:start_game', async (data: { sessionId: string }) => {
    try {
      await startGame(io, socket, data.sessionId)
    } catch (error) {
      console.error('Error starting game:', error)
      socket.emit('error', {
        code: 'INTERNAL_ERROR',
        message: 'Failed to start game',
      })
    }
  })

  /**
   * Handle advance game request.
   *
   * Called from the leaderboard screen to move to the next
   * question or end the game.
   */
  socket.on('host:advance_game', async (data: { sessionId: string }) => {
    try {
      await advanceGame(io, socket, data.sessionId)
    } catch (error) {
      console.error('Error advancing game:', error)
      socket.emit('error', {
        code: 'INTERNAL_ERROR',
        message: 'Failed to advance game',
      })
    }
  })

  /**
   * Handle show leaderboard request.
   *
   * Called after the reveal phase to show the current standings.
   */
  socket.on('host:show_leaderboard', async (data: { sessionId: string }) => {
    try {
      const store = getSessionStore()
      const session = await store.getSession(data.sessionId)

      if (!session) {
        socket.emit('error', { code: 'SESSION_NOT_FOUND', message: 'Session not found' })
        return
      }

      // Verify this is the host
      if (session.hostSocketId !== socket.id) {
        socket.emit('error', { code: 'UNAUTHORIZED', message: 'Only the host can show leaderboard' })
        return
      }

      // Fetch questions for the showLeaderboard function
      const questionSet = await prisma.questionSet.findUnique({
        where: { id: session.questionSetId },
        include: {
          questions: {
            orderBy: { order: 'asc' },
          },
        },
      })

      if (questionSet) {
        await showLeaderboard(io, data.sessionId, questionSet.questions)
      }
    } catch (error) {
      console.error('Error showing leaderboard:', error)
      socket.emit('error', {
        code: 'INTERNAL_ERROR',
        message: 'Failed to show leaderboard',
      })
    }
  })

  /**
   * Handle kick player request.
   *
   * Allows the host to remove a player from the game.
   * Only works in LOBBY phase.
   */
  socket.on('host:kick_player', async (data: { sessionId: string; playerId: string }) => {
    try {
      const store = getSessionStore()
      const session = await store.getSession(data.sessionId)

      if (!session) {
        socket.emit('error', { code: HostErrorCodes.SESSION_NOT_FOUND, message: 'Session not found' })
        return
      }

      // Verify this is the host
      if (session.hostSocketId !== socket.id) {
        socket.emit('error', { code: HostErrorCodes.UNAUTHORIZED, message: 'Only the host can kick players' })
        return
      }

      // Only allow kicking in LOBBY phase
      if (session.phase !== 'LOBBY') {
        socket.emit('error', { code: 'GAME_IN_PROGRESS', message: 'Cannot kick players during the game' })
        return
      }

      // Get the player to kick
      const player = await store.getPlayer(data.sessionId, data.playerId)
      if (!player) {
        socket.emit('error', { code: 'PLAYER_NOT_FOUND', message: 'Player not found' })
        return
      }

      // Remove the player
      await store.removePlayer(data.sessionId, data.playerId)

      console.log(`🚫 Player "${player.nickname}" kicked from room (session: ${data.sessionId})`)

      // Notify the kicked player
      io.to(data.sessionId).emit('player:kicked', {
        playerId: data.playerId,
        reason: 'You have been kicked by the host',
      })

      // Get updated roster and broadcast
      const players = await store.getPlayers(data.sessionId)
      const playerList = players.map((p) => ({
        playerId: p.playerId,
        nickname: p.nickname,
        connected: p.connected,
      }))

      io.to(data.sessionId).emit('room:roster_update', {
        players: playerList,
        count: playerList.filter((p) => p.connected).length,
      })
    } catch (error) {
      console.error('Error kicking player:', error)
      socket.emit('error', {
        code: HostErrorCodes.INTERNAL_ERROR,
        message: 'Failed to kick player',
      })
    }
  })
}
