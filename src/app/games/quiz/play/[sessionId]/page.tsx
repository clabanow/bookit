/**
 * Player Game Page
 *
 * The main game view for players. Handles all game phases:
 * - LOBBY: Waiting for host to start
 * - COUNTDOWN: 3-2-1 before question
 * - QUESTION: Answering the question (multiple choice OR spelling)
 * - REVEAL: Showing if answer was correct
 * - LEADERBOARD: Showing standings
 * - END: Game over, final results
 *
 * This is a client component because it uses Socket.IO for real-time updates.
 */

'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { getSocket, disconnectSocket } from '@/lib/realtime/client'
import { QuestionView } from '@/components/play/QuestionView'
import { SpellingAudio } from '@/components/play/SpellingAudio'
import { SpellingInput } from '@/components/play/SpellingInput'
import { GameChat } from '@/components/chat/GameChat'
import { Button } from '@/components/ui/button'

type GamePhase = 'LOBBY' | 'COUNTDOWN' | 'QUESTION' | 'REVEAL' | 'LEADERBOARD' | 'END'
type QuestionType = 'MULTIPLE_CHOICE' | 'SPELLING'

interface QuestionData {
  questionType: QuestionType
  // Multiple choice fields
  prompt?: string
  options?: string[]
  // Spelling fields
  word?: string
  wordLength?: number
  hint?: string
  // Common fields
  timeLimitSec: number
  startedAt: number
  questionIndex: number
  totalQuestions: number
}

interface RevealData {
  questionType: QuestionType
  correctIndex?: number
  correctAnswer?: string
  results: Array<{
    playerId: string
    nickname: string
    answerIndex: number | null
    spellingAnswer: string | null
    isCorrect: boolean
    points: number
    totalScore: number
  }>
}

interface LeaderboardEntry {
  playerId: string
  nickname: string
  score: number
}

interface PlayPageProps {
  params: Promise<{ sessionId: string }>
}

export default function PlayPage({ params }: PlayPageProps) {
  // Unwrap the params Promise
  const { sessionId } = use(params)

  // Game state
  const [phase, setPhase] = useState<GamePhase>('LOBBY')
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(3)
  const [question, setQuestion] = useState<QuestionData | null>(null)
  const [reveal, setReveal] = useState<RevealData | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [hasAnswered, setHasAnswered] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [spellingAnswer, setSpellingAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [myResult, setMyResult] = useState<{ isCorrect: boolean; points: number } | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [coinResult, setCoinResult] = useState<{ coinsEarned: number; isRepeatPlay: boolean } | null>(null)
  const [chatUserId, setChatUserId] = useState<string | null>(null)
  const [chatNickname, setChatNickname] = useState<string>('')

  // Fetch userId for chat (runs once on mount)
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setChatUserId(data.user.id)
        }
      } catch {
        // Chat is non-critical — silently fail
      }
    }
    fetchUser()
  }, [])

  // Timer for questions
  useEffect(() => {
    if (phase !== 'QUESTION' || !question || hasAnswered) return

    const endTime = question.startedAt + question.timeLimitSec * 1000

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
      setTimeLeft(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 100)

    return () => clearInterval(interval)
  }, [phase, question, hasAnswered])

  // Connect to socket and set up event listeners
  useEffect(() => {
    const socket = getSocket({ role: 'player' })

    // Check for stored player ID (for reconnection after refresh)
    const storedPlayerId = localStorage.getItem(`mack_player_${sessionId}`)

    // Handle connection success
    socket.on('connect', () => {
      console.log('Connected to game session:', sessionId)

      // If we have a stored player ID, try to reconnect
      if (storedPlayerId) {
        console.log('Attempting reconnection with player ID:', storedPlayerId)
        socket.emit('player:reconnect', {
          sessionId,
          playerId: storedPlayerId,
        })
      }
    })

    // Handle state sync (sent after reconnection)
    socket.on('player:state_sync', (data) => {
      console.log('State sync:', data)
      setPhase(data.phase as GamePhase)

      if (data.currentQuestion) {
        const q = data.currentQuestion as Record<string, unknown>
        setQuestion({
          questionType: (q.questionType as QuestionType) || 'MULTIPLE_CHOICE',
          prompt: q.prompt as string | undefined,
          options: q.options as string[] | undefined,
          word: q.word as string | undefined,
          wordLength: q.wordLength as number | undefined,
          hint: q.hint as string | undefined,
          timeLimitSec: q.timeLimitSec as number,
          startedAt: Date.now() - (((q.timeLimitSec as number) - (data.timeRemaining ?? 0)) * 1000),
          questionIndex: q.questionIndex as number,
          totalQuestions: q.totalQuestions as number,
        })
      }

      if (data.hasAnswered !== undefined) {
        setHasAnswered(data.hasAnswered)
      }
      if (data.selectedAnswer !== undefined) {
        setSelectedAnswer(data.selectedAnswer)
      }
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard)
      }
    })

    // Game countdown started
    socket.on('game:countdown', (data) => {
      console.log('Countdown:', data)
      setPhase('COUNTDOWN')
      // Animate countdown (duration is in ms, so divide by 1000)
      let count = Math.ceil(data.duration / 1000)
      setCountdown(count)
      const timer = setInterval(() => {
        count--
        setCountdown(count)
        if (count <= 0) clearInterval(timer)
      }, 1000)
    })

    // New question
    socket.on('game:question', (data) => {
      console.log('Question:', data)
      const d = data as Record<string, unknown>
      setPhase('QUESTION')
      setQuestion({
        questionType: (d.questionType as QuestionType) || 'MULTIPLE_CHOICE',
        prompt: d.prompt as string | undefined,
        options: d.options as string[] | undefined,
        word: d.word as string | undefined,
        wordLength: d.wordLength as number | undefined,
        hint: d.hint as string | undefined,
        timeLimitSec: d.timeLimitSec as number,
        startedAt: d.startedAt as number,
        questionIndex: d.questionIndex as number,
        totalQuestions: d.totalQuestions as number,
      })
      setHasAnswered(false)
      setSelectedAnswer(null)
      setSpellingAnswer(null)
      setMyResult(null)
    })

    // Answer submitted confirmation
    socket.on('player:answer_confirmed', (data) => {
      console.log('Answer confirmed:', data)
      const d = data as Record<string, unknown>
      setHasAnswered(true)
      if (d.answerIndex !== undefined) {
        setSelectedAnswer(d.answerIndex as number)
      }
      if (d.spellingAnswer !== undefined) {
        setSpellingAnswer(d.spellingAnswer as string)
      }
    })

    // Reveal correct answer
    socket.on('game:reveal', (data) => {
      console.log('Reveal:', data)
      const d = data as Record<string, unknown>
      setPhase('REVEAL')
      setReveal({
        questionType: (d.questionType as QuestionType) || 'MULTIPLE_CHOICE',
        correctIndex: d.correctIndex as number | undefined,
        correctAnswer: d.correctAnswer as string | undefined,
        results: d.results as RevealData['results'],
      })
      // Find my result
      if (playerId) {
        const results = d.results as Array<{ playerId: string; isCorrect: boolean; points: number }>
        const myResultData = results.find((r) => r.playerId === playerId)
        if (myResultData) {
          setMyResult({
            isCorrect: myResultData.isCorrect,
            points: myResultData.points,
          })
        }
      }
    })

    // Leaderboard
    socket.on('game:leaderboard', (data) => {
      console.log('Leaderboard:', data)
      setPhase('LEADERBOARD')
      setLeaderboard(data.leaderboard)
    })

    // Game ended
    socket.on('game:end', (data: Record<string, unknown>) => {
      console.log('Game ended:', data)
      setPhase('END')
      setLeaderboard(data.finalStandings as LeaderboardEntry[])

      // Extract coin result for this player
      const coinResults = data.coinResults as
        | Array<{ playerId: string; coinsEarned: number; isRepeatPlay: boolean }>
        | undefined
      if (coinResults && playerId) {
        const myCoinResult = coinResults.find((r) => r.playerId === playerId)
        if (myCoinResult) {
          setCoinResult({
            coinsEarned: myCoinResult.coinsEarned,
            isRepeatPlay: myCoinResult.isRepeatPlay,
          })
        }
      }
    })

    // Error handling
    socket.on('error', (data) => {
      console.error('Game error:', data)
      setError(data.message)
    })

    // Handle being kicked by host
    socket.on('player:kicked', (data) => {
      const storedId = localStorage.getItem(`mack_player_${sessionId}`)
      if (data.playerId === storedId || data.playerId === playerId) {
        console.log('You were kicked:', data.reason)
        localStorage.removeItem(`mack_player_${sessionId}`)
        setError('You have been kicked from the game')
        disconnectSocket()
      }
    })

    // Store player ID from initial join or reconnection
    socket.on('player:joined', (data) => {
      setPlayerId(data.playerId)
      // Store in localStorage for reconnection after refresh
      localStorage.setItem(`mack_player_${sessionId}`, data.playerId)
      // Extract nickname for chat
      const me = data.players.find(
        (p: { playerId: string }) => p.playerId === data.playerId
      )
      if (me) setChatNickname((me as { nickname: string }).nickname)
    })

    return () => {
      disconnectSocket()
    }
  }, [sessionId, playerId])

  // Handle multiple choice answer submission
  const handleAnswer = useCallback(
    (answerIndex: number) => {
      if (hasAnswered) return

      const socket = getSocket({ role: 'player' })
      socket.emit('player:submit_answer', {
        sessionId,
        answerIndex,
      })

      // Optimistically update UI
      setSelectedAnswer(answerIndex)
      setHasAnswered(true)
    },
    [sessionId, hasAnswered]
  )

  // Handle spelling answer submission
  const handleSpellingAnswer = useCallback(
    (answer: string) => {
      if (hasAnswered) return

      const socket = getSocket({ role: 'player' })
      // Use type assertion for custom event
      ;(socket as unknown as { emit: (event: string, data: unknown) => void }).emit(
        'player:submit_spelling',
        { sessionId, answer }
      )

      // Optimistically update UI
      setSpellingAnswer(answer)
      setHasAnswered(true)
    },
    [sessionId, hasAnswered]
  )

  // Chat overlay — renders as a fixed floating button on all phases
  const chatOverlay = (
    <GameChatOverlay
      sessionId={sessionId}
      playerId={playerId}
      userId={chatUserId}
      nickname={chatNickname}
    />
  )

  // Error display
  if (error) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex min-h-screen flex-col items-center justify-center bg-red-50 p-4 md:p-8"
      >
        <h1 className="mb-4 text-xl md:text-2xl font-bold text-red-600">Error</h1>
        <p className="text-red-500 text-center">{error}</p>
      </div>
    )
  }

  // LOBBY phase - waiting for game to start
  if (phase === 'LOBBY') {
    return (
      <>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-600 to-purple-800 p-4 md:p-8 text-white">
          <div className="mb-6 md:mb-8 text-5xl md:text-6xl">🎮</div>
          <h1 className="mb-4 text-xl md:text-2xl font-bold">You&apos;re in!</h1>
          <p className="text-purple-200 text-center">Waiting for host to start the game...</p>
          <div className="mt-6 md:mt-8 animate-pulse text-base md:text-lg">Get ready!</div>
        </div>
        {chatOverlay}
      </>
    )
  }

  // COUNTDOWN phase - 3-2-1 before question
  if (phase === 'COUNTDOWN') {
    return (
      <>
        <div
          role="timer"
          aria-live="polite"
          aria-label={`Countdown: ${countdown} seconds`}
          className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-600 to-blue-800 p-4 md:p-8 text-white"
        >
          <div className="text-7xl sm:text-8xl md:text-9xl font-bold" aria-hidden="true">
            {countdown}
          </div>
          <p className="mt-6 md:mt-8 text-lg md:text-xl">Get ready!</p>
        </div>
        {chatOverlay}
      </>
    )
  }

  // QUESTION phase - answer the question
  if (phase === 'QUESTION' && question) {
    // Spelling question
    if (question.questionType === 'SPELLING') {
      return (
        <>
          <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-8">
            <div className="w-full max-w-md">
              {/* Question counter */}
              <div className="text-center mb-4 text-sm md:text-base text-slate-400">
                Question {question.questionIndex + 1} of {question.totalQuestions}
              </div>

              {/* Audio player */}
              <div className="mb-6 md:mb-8">
                <SpellingAudio
                  word={question.word || ''}
                  hint={question.hint || undefined}
                  autoPlay={true}
                />
              </div>

              {/* Input or waiting state */}
              {hasAnswered ? (
                <div className="text-center">
                  <div className="text-3xl md:text-4xl mb-4">✓</div>
                  <p className="text-green-400 text-lg md:text-xl">Answer submitted!</p>
                  <p className="text-slate-400 mt-2 text-sm md:text-base">You spelled: {spellingAnswer}</p>
                </div>
              ) : (
                <SpellingInput
                  wordLength={question.wordLength || 0}
                  onSubmit={handleSpellingAnswer}
                  timeLeft={timeLeft}
                />
              )}
            </div>
          </div>
          {chatOverlay}
        </>
      )
    }

    // Multiple choice question (default)
    return (
      <>
        <QuestionView
          prompt={question.prompt || ''}
          options={question.options || []}
          timeLimitSec={question.timeLimitSec}
          startedAt={question.startedAt}
          onAnswer={handleAnswer}
          hasAnswered={hasAnswered}
          selectedAnswer={selectedAnswer}
        />
        {chatOverlay}
      </>
    )
  }

  // REVEAL phase - show correct answer
  if (phase === 'REVEAL' && reveal) {
    const isSpelling = reveal.questionType === 'SPELLING'

    return (
      <>
        <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
          <div
            className={`mb-6 md:mb-8 text-6xl sm:text-7xl md:text-8xl ${myResult?.isCorrect ? 'text-green-500' : 'text-red-500'}`}
          >
            {myResult?.isCorrect ? '✓' : '✗'}
          </div>
          <h1 className="mb-4 text-2xl md:text-3xl font-bold">
            {myResult?.isCorrect ? 'Correct!' : 'Wrong!'}
          </h1>
          {myResult && (
            <p className="text-xl md:text-2xl text-gray-600">+{myResult.points} points</p>
          )}
          <p className="mt-4 text-sm md:text-base text-gray-500 text-center px-4">
            Correct answer:{' '}
            {isSpelling
              ? reveal.correctAnswer
              : question?.options?.[reveal.correctIndex ?? 0]}
          </p>
          {isSpelling && spellingAnswer && !myResult?.isCorrect && (
            <p className="mt-2 text-gray-400 text-xs md:text-sm">
              You spelled: {spellingAnswer}
            </p>
          )}
        </div>
        {chatOverlay}
      </>
    )
  }

  // LEADERBOARD phase - show standings
  if (phase === 'LEADERBOARD') {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-b from-purple-600 to-purple-800 p-4 md:p-8 text-white">
          <h1 className="mb-6 md:mb-8 text-center text-2xl md:text-3xl font-bold">Leaderboard</h1>
          <div className="mx-auto max-w-md space-y-2 md:space-y-3">
            {leaderboard.map((player, index) => (
              <div
                key={player.playerId}
                className={`flex items-center justify-between rounded-lg p-3 md:p-4 ${
                  player.playerId === playerId
                    ? 'bg-white text-purple-900'
                    : 'bg-purple-700'
                }`}
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <span className="text-xl md:text-2xl font-bold">#{index + 1}</span>
                  <span className="font-medium text-sm md:text-base">{player.nickname}</span>
                </div>
                <span className="text-lg md:text-xl font-bold">{player.score}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 md:mt-8 text-center text-purple-200 text-sm md:text-base">
            Waiting for next question...
          </p>
        </div>
        {chatOverlay}
      </>
    )
  }

  // END phase - game over
  if (phase === 'END') {
    const winner = leaderboard[0]
    const myRank = leaderboard.findIndex((p) => p.playerId === playerId) + 1
    const isWinner = myRank === 1

    return (
      <>
      <div className="min-h-screen bg-gradient-to-b from-yellow-500 to-orange-500 p-4 md:p-8 text-white">
        <div className="mb-6 md:mb-8 text-center">
          <div className="text-6xl md:text-8xl">{isWinner ? '🏆' : '🎉'}</div>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold">Game Over!</h1>
        </div>

        {isWinner ? (
          <p className="mb-4 text-center text-xl md:text-2xl">You won!</p>
        ) : (
          <p className="mb-4 text-center text-lg md:text-2xl">
            {winner?.nickname} wins with {winner?.score} points!
          </p>
        )}

        {/* Coins earned display */}
        {coinResult && (
          <div className="mb-6 md:mb-8 text-center">
            <div className="inline-block bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-4 py-2">
              <span className="text-yellow-300 text-lg font-bold">
                +{coinResult.coinsEarned} coins
              </span>
              {coinResult.isRepeatPlay && (
                <span className="block text-yellow-500/70 text-xs mt-0.5">
                  (repeat play — 50% coins)
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-md space-y-2 md:space-y-3">
          {leaderboard.slice(0, 5).map((player, index) => (
            <div
              key={player.playerId}
              className={`flex items-center justify-between rounded-lg p-3 md:p-4 ${
                player.playerId === playerId
                  ? 'bg-white text-orange-900'
                  : 'bg-orange-400'
              }`}
            >
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-xl md:text-2xl font-bold">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </span>
                <span className="font-medium text-sm md:text-base">{player.nickname}</span>
              </div>
              <span className="text-lg md:text-xl font-bold">{player.score}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 md:mt-8 text-center">
          <Button
            onClick={() => (window.location.href = '/games/quiz/join')}
            className="bg-white text-orange-600 hover:bg-orange-100"
          >
            Play Again
          </Button>
        </div>
      </div>
      {chatOverlay}
      </>
    )
  }

  // Fallback
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Loading...</p>
    </div>
  )
}

/**
 * Wrapper that renders GameChat overlay on all game phases.
 * Extracted as a separate component so it doesn't remount on phase changes.
 */
function GameChatOverlay({
  sessionId,
  playerId,
  userId,
  nickname,
}: {
  sessionId: string
  playerId: string | null
  userId: string | null
  nickname: string
}) {
  if (!playerId || !userId || !nickname) return null
  return (
    <GameChat
      sessionId={sessionId}
      playerId={playerId}
      userId={userId}
      playerNickname={nickname}
    />
  )
}
