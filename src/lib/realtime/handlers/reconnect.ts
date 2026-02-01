/**
 * Player Reconnection Handler
 *
 * Handles players reconnecting to an active game after:
 * - Browser refresh
 * - Temporary network disconnect
 * - Switching tabs/apps on mobile
 *
 * The key insight is that we store playerId in the browser (localStorage)
 * so when they reconnect, we can find their player record and restore state.
 */

import type { Server, Socket } from 'socket.io'
import { getSessionStore } from '@/lib/session'
import { prisma } from '@/lib/db'

/**
 * Handle a player attempting to reconnect to an active game.
 *
 * Flow:
 * 1. Player sends their stored sessionId and playerId
 * 2. We verify the session exists and is still active
 * 3. We find their player record
 * 4. We update their socketId (it changed when they reconnected)
 * 5. We send them the current game state
 *
 * @param io - Socket.IO server for broadcasting
 * @param socket - The reconnecting player's new socket
 * @param sessionId - The game session they're trying to rejoin
 * @param playerId - Their player ID from before
 */
export async function handlePlayerReconnect(
  io: Server,
  socket: Socket,
  sessionId: string,
  playerId: string
): Promise<void> {
  const store = getSessionStore()

  try {
    // 1. Find the session
    const session = await store.getSession(sessionId)
    if (!session) {
      socket.emit('error', {
        code: 'SESSION_NOT_FOUND',
        message: 'Game session has ended or does not exist',
      })
      return
    }

    // 2. Find the player
    const player = await store.getPlayer(sessionId, playerId)
    if (!player) {
      socket.emit('error', {
        code: 'PLAYER_NOT_FOUND',
        message: 'Player not found in this game. You may need to rejoin.',
      })
      return
    }

    // 3. Update their socket ID and mark as connected
    await store.updatePlayer(sessionId, playerId, {
      socketId: socket.id,
      connected: true,
    })

    // 4. Join the Socket.IO room
    socket.join(sessionId)

    console.log(`🔄 Player "${player.nickname}" reconnected to session ${sessionId}`)

    // 5. Build current state to send to player
    const players = await store.getPlayers(sessionId)
    const playerList = players.map((p) => ({
      playerId: p.playerId,
      nickname: p.nickname,
      connected: p.connected,
    }))

    // 6. Get current question data if in a game phase
    let currentQuestion = null
    if (session.phase === 'QUESTION' || session.phase === 'REVEAL') {
      const questionSet = await prisma.questionSet.findUnique({
        where: { id: session.questionSetId },
        include: {
          questions: {
            orderBy: { order: 'asc' },
          },
        },
      })

      if (questionSet && questionSet.questions[session.currentQuestionIndex]) {
        const q = questionSet.questions[session.currentQuestionIndex]
        currentQuestion = {
          questionIndex: session.currentQuestionIndex,
          totalQuestions: questionSet.questions.length,
          prompt: q.prompt,
          options: q.options,
          timeLimitSec: q.timeLimitSec,
        }
      }
    }

    // 7. Calculate time remaining if in QUESTION phase
    let timeRemaining = null
    if (session.phase === 'QUESTION' && session.questionStartedAt && currentQuestion) {
      const elapsed = (Date.now() - session.questionStartedAt) / 1000
      timeRemaining = Math.max(0, currentQuestion.timeLimitSec - elapsed)
    }

    // 8. Get leaderboard if relevant
    const leaderboard = players
      .map((p) => ({
        playerId: p.playerId,
        nickname: p.nickname,
        score: p.score,
      }))
      .sort((a, b) => b.score - a.score)

    // 9. Send state sync to the reconnecting player
    socket.emit('player:state_sync', {
      phase: session.phase,
      currentQuestion,
      timeRemaining,
      score: player.score,
      leaderboard,
      hasAnswered: player.lastAnswerIndex !== null,
      selectedAnswer: player.lastAnswerIndex,
    })

    // 10. Also send them the joined confirmation
    socket.emit('player:joined', {
      sessionId,
      playerId,
      players: playerList,
    })

    // 11. Broadcast roster update to everyone (player is back!)
    io.to(sessionId).emit('room:roster_update', {
      players: playerList,
      count: playerList.length,
    })
  } catch (error) {
    console.error('Error during player reconnect:', error)
    socket.emit('error', {
      code: 'RECONNECT_FAILED',
      message: 'Failed to reconnect to game',
    })
  }
}

/**
 * Check if a player can reconnect to a session.
 * Used before attempting full reconnection.
 */
export async function canPlayerReconnect(
  sessionId: string,
  playerId: string
): Promise<{ canReconnect: boolean; reason?: string }> {
  const store = getSessionStore()

  const session = await store.getSession(sessionId)
  if (!session) {
    return { canReconnect: false, reason: 'Session has ended' }
  }

  if (session.phase === 'END') {
    return { canReconnect: false, reason: 'Game has already ended' }
  }

  const player = await store.getPlayer(sessionId, playerId)
  if (!player) {
    return { canReconnect: false, reason: 'Player not found' }
  }

  return { canReconnect: true }
}
