/**
 * Game Event Handlers
 *
 * Handles game flow events like starting the game, countdown,
 * question timing, and transitioning between phases.
 *
 * This is separate from host.ts because game logic is complex
 * and deserves its own module.
 */

import type { Server, Socket } from 'socket.io'
import { getSessionStore } from '@/lib/session'
import { transition } from '@/lib/stateMachine'
import { prisma } from '@/lib/db'

/** How long the countdown lasts before each question (ms) */
const COUNTDOWN_DURATION_MS = 3000

/**
 * Start the game - transition from LOBBY to COUNTDOWN.
 *
 * Called when the host clicks "Start Game". This:
 * 1. Validates the session exists and host is authorized
 * 2. Fetches the question set from the database
 * 3. Transitions the game state to COUNTDOWN
 * 4. Broadcasts to all players that the game is starting
 * 5. After countdown, transitions to first QUESTION
 *
 * @param io - Socket.IO server for broadcasting
 * @param socket - Host's socket connection
 * @param sessionId - The game session ID
 */
export async function startGame(
  io: Server,
  socket: Socket,
  sessionId: string
): Promise<void> {
  const store = getSessionStore()

  // Get the session
  const session = await store.getSession(sessionId)
  if (!session) {
    socket.emit('error', { code: 'SESSION_NOT_FOUND', message: 'Session not found' })
    return
  }

  // Verify this is the host
  if (session.hostSocketId !== socket.id) {
    socket.emit('error', { code: 'UNAUTHORIZED', message: 'Only the host can start the game' })
    return
  }

  // Use state machine to validate transition
  const result = transition(session.phase, 'START_GAME')
  if (!result.success) {
    socket.emit('error', { code: 'INVALID_STATE', message: result.error })
    return
  }

  // Fetch the question set to get total question count
  const questionSet = await prisma.questionSet.findUnique({
    where: { id: session.questionSetId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!questionSet || questionSet.questions.length === 0) {
    socket.emit('error', {
      code: 'NO_QUESTIONS',
      message: 'This question set has no questions',
    })
    return
  }

  // Update session state
  await store.updateSession(sessionId, {
    phase: 'COUNTDOWN',
    currentQuestionIndex: 0,
  })

  console.log(`🎮 Game starting in room ${session.roomCode}`)

  // Broadcast countdown start to all clients in the room
  io.to(sessionId).emit('game:countdown', {
    phase: 'COUNTDOWN',
    duration: COUNTDOWN_DURATION_MS,
    totalQuestions: questionSet.questions.length,
  })

  // After countdown completes, start the first question
  setTimeout(async () => {
    await startQuestion(io, sessionId, 0, questionSet.questions)
  }, COUNTDOWN_DURATION_MS)
}

/**
 * Start a question - transition from COUNTDOWN to QUESTION.
 *
 * Sends the question to all players and starts the timer.
 * The timer is managed server-side to prevent cheating.
 */
export async function startQuestion(
  io: Server,
  sessionId: string,
  questionIndex: number,
  questions: Array<{
    id: string
    prompt: string
    options: string[]
    correctIndex: number
    timeLimitSec: number
  }>
): Promise<void> {
  const store = getSessionStore()
  const session = await store.getSession(sessionId)

  if (!session) {
    console.error('Session not found when starting question')
    return
  }

  // Validate we can transition to QUESTION
  const result = transition(session.phase, 'COUNTDOWN_COMPLETE')
  if (!result.success) {
    console.error('Cannot start question:', result.error)
    return
  }

  const question = questions[questionIndex]
  if (!question) {
    console.error('Question not found at index', questionIndex)
    return
  }

  const now = Date.now()

  // Update session state
  await store.updateSession(sessionId, {
    phase: 'QUESTION',
    currentQuestionIndex: questionIndex,
    questionStartedAt: now,
  })

  // Clear all player answers from previous question
  const players = await store.getPlayers(sessionId)
  for (const player of players) {
    await store.updatePlayer(sessionId, player.playerId, {
      lastAnswerIndex: null,
      lastAnswerTime: null,
    })
  }

  console.log(`❓ Question ${questionIndex + 1}/${questions.length} started`)

  // Send question to all clients
  // Note: We don't send the correct answer to prevent cheating!
  io.to(sessionId).emit('game:question', {
    phase: 'QUESTION',
    questionIndex,
    totalQuestions: questions.length,
    prompt: question.prompt,
    options: question.options,
    timeLimitSec: question.timeLimitSec,
    startedAt: now,
  })

  // Set up timer for when question ends
  setTimeout(async () => {
    await endQuestion(io, sessionId, questionIndex, questions)
  }, question.timeLimitSec * 1000)
}

/**
 * End a question - transition from QUESTION to REVEAL.
 *
 * Called when the timer expires. Calculates scores and shows
 * the correct answer.
 */
export async function endQuestion(
  io: Server,
  sessionId: string,
  questionIndex: number,
  questions: Array<{
    id: string
    prompt: string
    options: string[]
    correctIndex: number
    timeLimitSec: number
  }>
): Promise<void> {
  const store = getSessionStore()
  const session = await store.getSession(sessionId)

  if (!session) {
    console.error('Session not found when ending question')
    return
  }

  // Only end if we're still on this question (prevent double-end)
  if (session.phase !== 'QUESTION' || session.currentQuestionIndex !== questionIndex) {
    console.log('Question already ended or moved on')
    return
  }

  const result = transition(session.phase, 'TIME_UP')
  if (!result.success) {
    console.error('Cannot end question:', result.error)
    return
  }

  const question = questions[questionIndex]

  // Update session state
  await store.updateSession(sessionId, {
    phase: 'REVEAL',
    questionStartedAt: null,
  })

  // Calculate and update scores
  const { calculateScoreFromTimestamps } = await import('@/lib/scoring')
  const players = await store.getPlayers(sessionId)
  const results: Array<{
    playerId: string
    nickname: string
    answerIndex: number | null
    isCorrect: boolean
    points: number
    totalScore: number
  }> = []

  for (const player of players) {
    const isCorrect = player.lastAnswerIndex === question.correctIndex
    const points =
      player.lastAnswerTime && session.questionStartedAt
        ? calculateScoreFromTimestamps(
            isCorrect,
            session.questionStartedAt,
            player.lastAnswerTime,
            question.timeLimitSec
          )
        : 0

    // Update player's total score
    const newScore = player.score + points
    await store.updatePlayer(sessionId, player.playerId, {
      score: newScore,
    })

    results.push({
      playerId: player.playerId,
      nickname: player.nickname,
      answerIndex: player.lastAnswerIndex,
      isCorrect,
      points,
      totalScore: newScore,
    })
  }

  console.log(`✅ Question ${questionIndex + 1} revealed, correct: ${question.correctIndex}`)

  // Broadcast reveal to all clients
  io.to(sessionId).emit('game:reveal', {
    phase: 'REVEAL',
    questionIndex,
    correctIndex: question.correctIndex,
    results,
  })
}

/**
 * Show the leaderboard after a reveal.
 *
 * Called by the host or automatically after reveal timeout.
 */
export async function showLeaderboard(
  io: Server,
  sessionId: string,
  questions: Array<{
    id: string
    prompt: string
    options: string[]
    correctIndex: number
    timeLimitSec: number
  }>
): Promise<void> {
  const store = getSessionStore()
  const session = await store.getSession(sessionId)

  if (!session) {
    console.error('Session not found when showing leaderboard')
    return
  }

  const result = transition(session.phase, 'SHOW_LEADERBOARD')
  if (!result.success) {
    console.error('Cannot show leaderboard:', result.error)
    return
  }

  // Update session state
  await store.updateSession(sessionId, {
    phase: 'LEADERBOARD',
  })

  // Get all players sorted by score
  const players = await store.getPlayers(sessionId)
  const leaderboard = players
    .map((p) => ({
      playerId: p.playerId,
      nickname: p.nickname,
      score: p.score,
    }))
    .sort((a, b) => b.score - a.score)

  const isLastQuestion = session.currentQuestionIndex >= questions.length - 1

  console.log(`📊 Leaderboard shown (question ${session.currentQuestionIndex + 1}/${questions.length})`)

  // Broadcast leaderboard to all clients
  io.to(sessionId).emit('game:leaderboard', {
    phase: 'LEADERBOARD',
    questionIndex: session.currentQuestionIndex,
    totalQuestions: questions.length,
    isLastQuestion,
    leaderboard,
  })
}

/**
 * Advance to the next question or end the game.
 *
 * Called by the host from the leaderboard screen.
 */
export async function advanceGame(
  io: Server,
  socket: Socket,
  sessionId: string
): Promise<void> {
  const store = getSessionStore()
  const session = await store.getSession(sessionId)

  if (!session) {
    socket.emit('error', { code: 'SESSION_NOT_FOUND', message: 'Session not found' })
    return
  }

  // Verify this is the host
  if (session.hostSocketId !== socket.id) {
    socket.emit('error', { code: 'UNAUTHORIZED', message: 'Only the host can advance the game' })
    return
  }

  // Fetch questions to know the total
  const questionSet = await prisma.questionSet.findUnique({
    where: { id: session.questionSetId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!questionSet) {
    socket.emit('error', { code: 'QUESTION_SET_NOT_FOUND', message: 'Question set not found' })
    return
  }

  const totalQuestions = questionSet.questions.length
  const isLastQuestion = session.currentQuestionIndex >= totalQuestions - 1

  if (isLastQuestion) {
    // End the game
    const result = transition(session.phase, 'GAME_OVER', {
      currentQuestionIndex: session.currentQuestionIndex,
      totalQuestions,
    })

    if (!result.success) {
      socket.emit('error', { code: 'INVALID_STATE', message: result.error })
      return
    }

    await store.updateSession(sessionId, {
      phase: 'END',
    })

    // Get final standings
    const players = await store.getPlayers(sessionId)
    const finalStandings = players
      .map((p) => ({
        playerId: p.playerId,
        nickname: p.nickname,
        score: p.score,
      }))
      .sort((a, b) => b.score - a.score)

    console.log(`🏆 Game over! Winner: ${finalStandings[0]?.nickname ?? 'No players'}`)

    io.to(sessionId).emit('game:end', {
      phase: 'END',
      finalStandings,
    })
  } else {
    // Next question
    const result = transition(session.phase, 'NEXT_QUESTION', {
      currentQuestionIndex: session.currentQuestionIndex,
      totalQuestions,
    })

    if (!result.success) {
      socket.emit('error', { code: 'INVALID_STATE', message: result.error })
      return
    }

    // Update to COUNTDOWN phase
    await store.updateSession(sessionId, {
      phase: 'COUNTDOWN',
      currentQuestionIndex: session.currentQuestionIndex + 1,
    })

    console.log(`⏭️ Moving to question ${session.currentQuestionIndex + 2}/${totalQuestions}`)

    // Broadcast countdown
    io.to(sessionId).emit('game:countdown', {
      phase: 'COUNTDOWN',
      duration: COUNTDOWN_DURATION_MS,
      questionIndex: session.currentQuestionIndex + 1,
      totalQuestions,
    })

    // Start next question after countdown
    setTimeout(async () => {
      await startQuestion(
        io,
        sessionId,
        session.currentQuestionIndex + 1,
        questionSet.questions
      )
    }, COUNTDOWN_DURATION_MS)
  }
}
