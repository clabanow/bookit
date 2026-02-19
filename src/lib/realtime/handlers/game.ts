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
import { calculateCoinsForQuestion, calculateGameEndBonus, getRepeatMultiplier } from '@/lib/scoring/coins'
import { calculateSoccerScore } from '@/lib/scoring/soccer'

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
    questionType: 'MULTIPLE_CHOICE' | 'SPELLING'
    options: string[]
    correctIndex: number
    answer: string | null
    hint: string | null
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

  // Clear all player answers and penalty state from previous question
  const players = await store.getPlayers(sessionId)
  for (const player of players) {
    await store.updatePlayer(sessionId, player.playerId, {
      lastAnswerIndex: null,
      lastSpellingAnswer: null,
      lastAnswerTime: null,
      penaltyDirection: null,
      penaltyResult: null,
    })
  }

  console.log(`❓ Question ${questionIndex + 1}/${questions.length} started`)

  // Send question to all clients
  // Note: We don't send the correct answer to prevent cheating!
  const questionData: Record<string, unknown> = {
    phase: 'QUESTION',
    questionIndex,
    totalQuestions: questions.length,
    questionType: question.questionType,
    timeLimitSec: question.timeLimitSec,
    startedAt: now,
  }

  if (question.questionType === 'SPELLING') {
    // For spelling: send the word to pronounce (prompt) and optional hint
    // The player will hear this spoken aloud
    questionData.word = question.prompt
    questionData.wordLength = question.answer?.length || question.prompt.length
    questionData.hint = question.hint
  } else {
    // For multiple choice: send prompt and options
    questionData.prompt = question.prompt
    questionData.options = question.options
  }

  io.to(sessionId).emit('game:question', questionData)

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
    questionType: 'MULTIPLE_CHOICE' | 'SPELLING'
    options: string[]
    correctIndex: number
    answer: string | null
    hint: string | null
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

  const question = questions[questionIndex]

  // Soccer mode: go to penalty kicks instead of directly to reveal
  if (session.gameType === 'soccer') {
    await startPenaltyPhase(io, sessionId, questionIndex, questions)
    return
  }

  // Quiz mode: score immediately and go to reveal
  const result = transition(session.phase, 'TIME_UP')
  if (!result.success) {
    console.error('Cannot end question:', result.error)
    return
  }

  // Update session state
  await store.updateSession(sessionId, {
    phase: 'REVEAL',
    questionStartedAt: null,
  })

  // Calculate and update scores
  const { calculateScoreFromTimestamps } = await import('@/lib/scoring')
  const { scoreSpellingAnswer } = await import('@/lib/scoring/spelling')
  const players = await store.getPlayers(sessionId)
  const results: Array<{
    playerId: string
    nickname: string
    answerIndex: number | null
    spellingAnswer: string | null
    isCorrect: boolean
    points: number
    totalScore: number
    coinsForQuestion: number
  }> = []

  for (const player of players) {
    let isCorrect = false
    let points = 0

    if (question.questionType === 'SPELLING') {
      // Spelling mode: check if typed answer matches
      if (player.lastSpellingAnswer && question.answer) {
        const spellingResult = scoreSpellingAnswer({
          submittedAnswer: player.lastSpellingAnswer,
          correctAnswer: question.answer,
          timeTakenMs: player.lastAnswerTime && session.questionStartedAt
            ? player.lastAnswerTime - session.questionStartedAt
            : question.timeLimitSec * 1000,
          timeLimitMs: question.timeLimitSec * 1000,
        })
        isCorrect = spellingResult.correct
        points = spellingResult.points
      }
    } else {
      // Multiple choice mode: check if selected option matches
      isCorrect = player.lastAnswerIndex === question.correctIndex
      points =
        player.lastAnswerTime && session.questionStartedAt
          ? calculateScoreFromTimestamps(
              isCorrect,
              session.questionStartedAt,
              player.lastAnswerTime,
              question.timeLimitSec
            )
          : 0
    }

    // Update streak: increment if correct, reset if wrong
    const newStreak = isCorrect ? player.streak + 1 : 0

    // Calculate coins for this question
    const coinsForQuestion = calculateCoinsForQuestion(isCorrect, newStreak)
    const newCoins = player.coinsEarned + coinsForQuestion

    // Update player's total score, streak, and coins
    const newScore = player.score + points
    await store.updatePlayer(sessionId, player.playerId, {
      score: newScore,
      streak: newStreak,
      coinsEarned: newCoins,
    })

    results.push({
      playerId: player.playerId,
      nickname: player.nickname,
      answerIndex: player.lastAnswerIndex,
      spellingAnswer: player.lastSpellingAnswer || null,
      isCorrect,
      points,
      totalScore: newScore,
      coinsForQuestion,
    })
  }

  console.log(`✅ Question ${questionIndex + 1} revealed`)

  // Broadcast reveal to all clients
  const revealData: Record<string, unknown> = {
    phase: 'REVEAL',
    questionIndex,
    questionType: question.questionType,
    results,
  }

  if (question.questionType === 'SPELLING') {
    revealData.correctAnswer = question.answer
  } else {
    revealData.correctIndex = question.correctIndex
  }

  io.to(sessionId).emit('game:reveal', revealData)
}

/** How long players have to choose a kick direction (ms) */
const PENALTY_TIMEOUT_MS = 8000

/** Miss types for wrong answers or timeouts */
const MISS_TYPES = ['sky_high', 'wide_left', 'wide_right', 'hit_post'] as const
type MissType = (typeof MISS_TYPES)[number]
type KickDirection = 'left' | 'center' | 'right'
const KICK_DIRECTIONS: KickDirection[] = ['left', 'center', 'right']

/**
 * Start the penalty kick phase (soccer mode only).
 *
 * After the quiz question ends, we determine who got it right/wrong,
 * then enter PENALTY_KICK phase where correct players choose kick direction.
 * Wrong players auto-miss.
 */
async function startPenaltyPhase(
  io: Server,
  sessionId: string,
  questionIndex: number,
  questions: Array<{
    id: string
    prompt: string
    questionType: 'MULTIPLE_CHOICE' | 'SPELLING'
    options: string[]
    correctIndex: number
    answer: string | null
    hint: string | null
    timeLimitSec: number
  }>
): Promise<void> {
  const store = getSessionStore()
  const session = await store.getSession(sessionId)
  if (!session) return

  const question = questions[questionIndex]

  // Transition QUESTION → PENALTY_KICK
  const result = transition(session.phase, 'PENALTY_START')
  if (!result.success) {
    console.error('Cannot start penalty phase:', result.error)
    return
  }

  await store.updateSession(sessionId, {
    phase: 'PENALTY_KICK',
    questionStartedAt: null,
  })

  // Determine correctness for each player
  const { scoreSpellingAnswer } = await import('@/lib/scoring/spelling')
  const players = await store.getPlayers(sessionId)
  const playerResults: Array<{ playerId: string; nickname: string; isCorrect: boolean }> = []

  for (const player of players) {
    let isCorrect = false

    if (question.questionType === 'SPELLING') {
      if (player.lastSpellingAnswer && question.answer) {
        const spellingResult = scoreSpellingAnswer({
          submittedAnswer: player.lastSpellingAnswer,
          correctAnswer: question.answer,
          timeTakenMs: player.lastAnswerTime && session.questionStartedAt
            ? player.lastAnswerTime - session.questionStartedAt
            : question.timeLimitSec * 1000,
          timeLimitMs: question.timeLimitSec * 1000,
        })
        isCorrect = spellingResult.correct
      }
    } else {
      isCorrect = player.lastAnswerIndex === question.correctIndex
    }

    // Mark wrong-answer players as immediate misses
    if (!isCorrect) {
      await store.updatePlayer(sessionId, player.playerId, {
        penaltyResult: 'miss',
        penaltyDirection: null,
      })
      playerResults.push({ playerId: player.playerId, nickname: player.nickname, isCorrect: false })
    } else {
      // Correct players: clear penalty fields, await their kick
      await store.updatePlayer(sessionId, player.playerId, {
        penaltyResult: null,
        penaltyDirection: null,
      })
      playerResults.push({ playerId: player.playerId, nickname: player.nickname, isCorrect: true })
    }
  }

  console.log(`⚽ Penalty kicks phase started (question ${questionIndex + 1})`)

  // Broadcast to all clients — each player will see if they got the quiz right
  io.to(sessionId).emit('game:penalty_kick', {
    phase: 'PENALTY_KICK',
    questionIndex,
    results: playerResults,
    timeoutMs: PENALTY_TIMEOUT_MS,
  })

  // Start penalty timeout — resolve after 8 seconds if not all kicks submitted
  setTimeout(async () => {
    await resolvePenalties(io, sessionId, questionIndex, questions)
  }, PENALTY_TIMEOUT_MS)
}

/**
 * Resolve all penalty kicks and transition to REVEAL.
 *
 * Called either when all correct players have kicked, or when the 8s timeout expires.
 * Double-resolution guard: only runs if still in PENALTY_KICK phase.
 */
export async function resolvePenalties(
  io: Server,
  sessionId: string,
  questionIndex: number,
  questions: Array<{
    id: string
    prompt: string
    questionType: 'MULTIPLE_CHOICE' | 'SPELLING'
    options: string[]
    correctIndex: number
    answer: string | null
    hint: string | null
    timeLimitSec: number
  }>
): Promise<void> {
  const store = getSessionStore()
  const session = await store.getSession(sessionId)

  if (!session) return

  // Double-resolution guard: only resolve once
  if (session.phase !== 'PENALTY_KICK') {
    console.log('Penalties already resolved')
    return
  }

  const result = transition(session.phase, 'PENALTY_COMPLETE')
  if (!result.success) {
    console.error('Cannot resolve penalties:', result.error)
    return
  }

  await store.updateSession(sessionId, {
    phase: 'REVEAL',
  })

  const question = questions[questionIndex]
  const players = await store.getPlayers(sessionId)

  // Build results for each player
  const penaltyResults: Array<{
    playerId: string
    nickname: string
    answerIndex: number | null
    spellingAnswer: string | null
    isCorrect: boolean
    penaltyResult: 'goal' | 'save' | 'miss'
    missType?: MissType
    goalieDirection?: KickDirection
    kickDirection?: KickDirection
    points: number
    totalScore: number
    coinsForQuestion: number
  }> = []

  for (const player of players) {
    // Determine quiz correctness
    let quizCorrect = false
    if (question.questionType === 'SPELLING') {
      if (player.lastSpellingAnswer && question.answer) {
        const { scoreSpellingAnswer } = await import('@/lib/scoring/spelling')
        const spellingResult = scoreSpellingAnswer({
          submittedAnswer: player.lastSpellingAnswer,
          correctAnswer: question.answer,
          timeTakenMs: player.lastAnswerTime && session.questionStartedAt
            ? player.lastAnswerTime - session.questionStartedAt
            : question.timeLimitSec * 1000,
          timeLimitMs: question.timeLimitSec * 1000,
        })
        quizCorrect = spellingResult.correct
      }
    } else {
      quizCorrect = player.lastAnswerIndex === question.correctIndex
    }

    let penaltyResult: 'goal' | 'save' | 'miss'
    let missType: MissType | undefined
    let goalieDirection: KickDirection | undefined
    let kickDirection: KickDirection | undefined

    if (!quizCorrect) {
      // Wrong quiz answer = automatic miss
      penaltyResult = 'miss'
      missType = MISS_TYPES[Math.floor(Math.random() * MISS_TYPES.length)]
    } else if (!player.penaltyDirection) {
      // Correct but didn't kick in time = miss (sky_high default)
      penaltyResult = 'miss'
      missType = 'sky_high'
    } else {
      // Correct + kicked: server randomly picks goalie direction
      kickDirection = player.penaltyDirection as KickDirection
      goalieDirection = KICK_DIRECTIONS[Math.floor(Math.random() * KICK_DIRECTIONS.length)]

      if (kickDirection === goalieDirection) {
        penaltyResult = 'save'
      } else {
        penaltyResult = 'goal'
      }
    }

    // Calculate score using soccer scoring (must pass BOTH gates)
    const answerTimeMs = player.lastAnswerTime && session.questionStartedAt
      ? player.lastAnswerTime - session.questionStartedAt
      : question.timeLimitSec * 1000
    const timeLimitMs = question.timeLimitSec * 1000

    const scoreResult = calculateSoccerScore({
      quizCorrect,
      penaltyScored: penaltyResult === 'goal',
      answerTimeMs,
      timeLimitMs,
      currentStreak: player.streak,
    })

    // Update player state
    const newScore = player.score + scoreResult.points
    await store.updatePlayer(sessionId, player.playerId, {
      score: newScore,
      streak: scoreResult.newStreak,
      coinsEarned: player.coinsEarned + scoreResult.coinsForQuestion,
      penaltyResult,
    })

    penaltyResults.push({
      playerId: player.playerId,
      nickname: player.nickname,
      answerIndex: player.lastAnswerIndex,
      spellingAnswer: player.lastSpellingAnswer || null,
      isCorrect: quizCorrect,
      penaltyResult,
      missType,
      goalieDirection,
      kickDirection,
      points: scoreResult.points,
      totalScore: newScore,
      coinsForQuestion: scoreResult.coinsForQuestion,
    })
  }

  console.log(`⚽ Penalties resolved (question ${questionIndex + 1})`)

  // Broadcast results — includes everything clients need for animations
  const revealData: Record<string, unknown> = {
    phase: 'REVEAL',
    questionIndex,
    questionType: question.questionType,
    gameType: 'soccer',
    results: penaltyResults,
  }

  if (question.questionType === 'SPELLING') {
    revealData.correctAnswer = question.answer
  } else {
    revealData.correctIndex = question.correctIndex
  }

  io.to(sessionId).emit('game:reveal', revealData)
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
    questionType: 'MULTIPLE_CHOICE' | 'SPELLING'
    options: string[]
    correctIndex: number
    answer: string | null
    hint: string | null
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

    // Award coins: apply placement bonus, repeat multiplier, persist to DB
    const coinResults: Array<{
      playerId: string
      coinsEarned: number
      isRepeatPlay: boolean
    }> = []

    for (let i = 0; i < finalStandings.length; i++) {
      const standing = finalStandings[i]
      const player = players.find((p) => p.playerId === standing.playerId)
      if (!player) continue

      const rank = i + 1
      const placementBonus = calculateGameEndBonus(rank)
      const baseCoins = player.coinsEarned + placementBonus

      // Check for repeat play (anti-farming)
      const multiplier = await getRepeatMultiplier(player.playerId, session.questionSetId)
      const finalCoins = Math.floor(baseCoins * multiplier)

      // Persist coins to database (increment, don't overwrite)
      try {
        await prisma.player.update({
          where: { id: player.playerId },
          data: { coins: { increment: finalCoins } },
        })

        // Record this game play for future anti-farming checks
        await prisma.gamePlay.create({
          data: {
            playerId: player.playerId,
            questionSetId: session.questionSetId,
            coinsEarned: finalCoins,
          },
        })
      } catch (dbError) {
        // Don't crash the game if DB write fails (player might be ephemeral/test)
        console.error(`Failed to persist coins for player ${player.playerId}:`, dbError)
      }

      coinResults.push({
        playerId: player.playerId,
        coinsEarned: finalCoins,
        isRepeatPlay: multiplier < 1,
      })
    }

    console.log(`🏆 Game over! Winner: ${finalStandings[0]?.nickname ?? 'No players'}`)

    io.to(sessionId).emit('game:end', {
      phase: 'END',
      finalStandings,
      coinResults,
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
