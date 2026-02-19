/**
 * Soccer Stud Play Page
 *
 * The player's game view for Soccer Stud mode.
 * Same phase structure as quiz, with an added PENALTY_KICK phase
 * between QUESTION and REVEAL.
 *
 * Phase flow:
 * LOBBY → COUNTDOWN → QUESTION → PENALTY_KICK → REVEAL → LEADERBOARD → (repeat) → END
 */

'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { getSocket, disconnectSocket } from '@/lib/realtime/client'
import { QuestionView } from '@/components/play/QuestionView'
import { SpellingAudio } from '@/components/play/SpellingAudio'
import { SpellingInput } from '@/components/play/SpellingInput'
import { PenaltyKick, type PenaltyResult } from '@/components/soccer/PenaltyKick'
import { GameChat } from '@/components/chat/GameChat'
import { Button } from '@/components/ui/button'

type GamePhase = 'LOBBY' | 'COUNTDOWN' | 'QUESTION' | 'PENALTY_KICK' | 'REVEAL' | 'LEADERBOARD' | 'END'
type QuestionType = 'MULTIPLE_CHOICE' | 'SPELLING'

interface QuestionData {
  questionType: QuestionType
  prompt?: string
  options?: string[]
  word?: string
  wordLength?: number
  hint?: string
  timeLimitSec: number
  startedAt: number
  questionIndex: number
  totalQuestions: number
}

interface LeaderboardEntry {
  playerId: string
  nickname: string
  score: number
}

interface PlayPageProps {
  params: Promise<{ sessionId: string }>
}

export default function SoccerPlayPage({ params }: PlayPageProps) {
  const { sessionId } = use(params)

  // Game state
  const [phase, setPhase] = useState<GamePhase>('LOBBY')
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(3)
  const [question, setQuestion] = useState<QuestionData | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [hasAnswered, setHasAnswered] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [spellingAnswer, setSpellingAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [coinResult, setCoinResult] = useState<{ coinsEarned: number; isRepeatPlay: boolean } | null>(null)
  const [chatUserId, setChatUserId] = useState<string | null>(null)
  const [chatNickname, setChatNickname] = useState<string>('')

  // Penalty kick state
  const [penaltyQuizCorrect, setPenaltyQuizCorrect] = useState(false)
  const [hasKicked, setHasKicked] = useState(false)
  const [penaltyResult, setPenaltyResult] = useState<PenaltyResult | null>(null)
  const [penaltyTimeLeftMs, setPenaltyTimeLeftMs] = useState(8000)
  const [penaltyStartedAt, setPenaltyStartedAt] = useState<number | null>(null)

  // Reveal state (stores result for the REVEAL phase)
  const [myResult, setMyResult] = useState<{
    isCorrect: boolean
    points: number
    penaltyResult?: string
  } | null>(null)

  // Fetch userId for chat
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setChatUserId(data.user.id)
        }
      } catch {
        // Chat is non-critical
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

  // Timer for penalty kick countdown
  useEffect(() => {
    if (phase !== 'PENALTY_KICK' || !penaltyStartedAt || hasKicked) return

    const updatePenaltyTimer = () => {
      const elapsed = Date.now() - penaltyStartedAt
      const remaining = Math.max(0, 8000 - elapsed)
      setPenaltyTimeLeftMs(remaining)
    }

    updatePenaltyTimer()
    const interval = setInterval(updatePenaltyTimer, 100)
    return () => clearInterval(interval)
  }, [phase, penaltyStartedAt, hasKicked])

  // Socket connection and event listeners
  useEffect(() => {
    const socket = getSocket({ role: 'player' })

    const storedPlayerId = localStorage.getItem(`mack_player_${sessionId}`)

    socket.on('connect', () => {
      if (storedPlayerId) {
        socket.emit('player:reconnect', { sessionId, playerId: storedPlayerId })
      }
    })

    socket.on('player:state_sync', (data) => {
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
      if (data.hasAnswered !== undefined) setHasAnswered(data.hasAnswered)
      if (data.selectedAnswer !== undefined) setSelectedAnswer(data.selectedAnswer)
      if (data.leaderboard) setLeaderboard(data.leaderboard)
    })

    // Game countdown
    socket.on('game:countdown', (data) => {
      setPhase('COUNTDOWN')
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
      // Reset penalty state for new question
      setPenaltyQuizCorrect(false)
      setHasKicked(false)
      setPenaltyResult(null)
      setPenaltyStartedAt(null)
    })

    // Answer confirmed
    socket.on('player:answer_confirmed', (data) => {
      const d = data as Record<string, unknown>
      setHasAnswered(true)
      if (d.answerIndex !== undefined) setSelectedAnswer(d.answerIndex as number)
      if (d.spellingAnswer !== undefined) setSpellingAnswer(d.spellingAnswer as string)
    })

    // Penalty kick phase (soccer-specific)
    socket.on('game:penalty_kick', (data) => {
      const d = data as Record<string, unknown>
      setPhase('PENALTY_KICK')
      setPenaltyStartedAt(Date.now())
      setPenaltyTimeLeftMs(d.timeoutMs as number)
      setHasKicked(false)
      setPenaltyResult(null)

      // Find this player's correctness
      const results = d.results as Array<{ playerId: string; isCorrect: boolean }>
      const storedId = localStorage.getItem(`mack_player_${sessionId}`)
      const me = results.find((r) => r.playerId === storedId || r.playerId === playerId)
      setPenaltyQuizCorrect(me?.isCorrect ?? false)
    })

    // Kick confirmed
    socket.on('player:kick_confirmed', () => {
      setHasKicked(true)
    })

    // Reveal (handles both quiz and soccer results)
    socket.on('game:reveal', (data) => {
      const d = data as Record<string, unknown>
      setPhase('REVEAL')

      // Find my result
      const results = d.results as Array<{
        playerId: string
        isCorrect: boolean
        points: number
        penaltyResult?: string
        missType?: string
        goalieDirection?: string
        kickDirection?: string
      }>
      const storedId = localStorage.getItem(`mack_player_${sessionId}`)
      const me = results.find((r) => r.playerId === storedId || r.playerId === playerId)

      if (me) {
        // If this is a soccer reveal, set the penalty result for the animation
        if (d.gameType === 'soccer' && me.penaltyResult) {
          setPenaltyResult({
            penaltyResult: me.penaltyResult as 'goal' | 'save' | 'miss',
            missType: me.missType as 'sky_high' | 'wide_left' | 'wide_right' | 'hit_post' | undefined,
            goalieDirection: me.goalieDirection as 'left' | 'center' | 'right' | undefined,
            kickDirection: me.kickDirection as 'left' | 'center' | 'right' | undefined,
            points: me.points,
          })

          setMyResult({
            isCorrect: me.isCorrect,
            points: me.points,
            penaltyResult: me.penaltyResult,
          })
        } else {
          setMyResult({
            isCorrect: me.isCorrect,
            points: me.points,
          })
        }
      }
    })

    // Leaderboard
    socket.on('game:leaderboard', (data) => {
      setPhase('LEADERBOARD')
      setLeaderboard(data.leaderboard)
    })

    // Game ended
    socket.on('game:end', (data: Record<string, unknown>) => {
      setPhase('END')
      setLeaderboard(data.finalStandings as LeaderboardEntry[])
      const coinResults = data.coinResults as
        | Array<{ playerId: string; coinsEarned: number; isRepeatPlay: boolean }>
        | undefined
      if (coinResults && playerId) {
        const myCoinResult = coinResults.find((r) => r.playerId === playerId)
        if (myCoinResult) {
          setCoinResult({ coinsEarned: myCoinResult.coinsEarned, isRepeatPlay: myCoinResult.isRepeatPlay })
        }
      }
    })

    // Errors
    socket.on('error', (data) => {
      setError(data.message)
    })

    socket.on('player:kicked', (data) => {
      const storedId = localStorage.getItem(`mack_player_${sessionId}`)
      if (data.playerId === storedId || data.playerId === playerId) {
        localStorage.removeItem(`mack_player_${sessionId}`)
        setError('You have been kicked from the game')
        disconnectSocket()
      }
    })

    socket.on('player:joined', (data) => {
      setPlayerId(data.playerId)
      localStorage.setItem(`mack_player_${sessionId}`, data.playerId)
      const me = data.players.find(
        (p: { playerId: string }) => p.playerId === data.playerId
      )
      if (me) setChatNickname((me as { nickname: string }).nickname)
    })

    return () => {
      disconnectSocket()
    }
  }, [sessionId, playerId])

  // Handle multiple choice answer
  const handleAnswer = useCallback(
    (answerIndex: number) => {
      if (hasAnswered) return
      const socket = getSocket({ role: 'player' })
      socket.emit('player:submit_answer', { sessionId, answerIndex })
      setSelectedAnswer(answerIndex)
      setHasAnswered(true)
    },
    [sessionId, hasAnswered]
  )

  // Handle spelling answer
  const handleSpellingAnswer = useCallback(
    (answer: string) => {
      if (hasAnswered) return
      const socket = getSocket({ role: 'player' })
      ;(socket as unknown as { emit: (event: string, data: unknown) => void }).emit(
        'player:submit_spelling',
        { sessionId, answer }
      )
      setSpellingAnswer(answer)
      setHasAnswered(true)
    },
    [sessionId, hasAnswered]
  )

  // Handle penalty kick direction
  const handleKick = useCallback(
    (direction: 'left' | 'center' | 'right') => {
      if (hasKicked) return
      const socket = getSocket({ role: 'player' })
      socket.emit('player:submit_kick', { sessionId, direction })
    },
    [sessionId, hasKicked]
  )

  // Chat overlay
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
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center bg-red-50 p-4 md:p-8">
        <h1 className="mb-4 text-xl md:text-2xl font-bold text-red-600">Error</h1>
        <p className="text-red-500 text-center">{error}</p>
      </div>
    )
  }

  // LOBBY
  if (phase === 'LOBBY') {
    return (
      <>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-700 to-green-900 p-4 md:p-8 text-white">
          <div className="mb-6 md:mb-8 text-5xl md:text-6xl">⚽</div>
          <h1 className="mb-4 text-xl md:text-2xl font-bold">You&apos;re in!</h1>
          <p className="text-green-200 text-center">Waiting for host to start Soccer Stud...</p>
          <div className="mt-6 md:mt-8 animate-pulse text-base md:text-lg">Get ready to kick!</div>
        </div>
        {chatOverlay}
      </>
    )
  }

  // COUNTDOWN
  if (phase === 'COUNTDOWN') {
    return (
      <>
        <div
          role="timer"
          aria-label={`Countdown: ${countdown} seconds`}
          className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-600 to-green-800 p-4 md:p-8 text-white"
        >
          <div className="text-7xl sm:text-8xl md:text-9xl font-bold">{countdown}</div>
          <p className="mt-6 md:mt-8 text-lg md:text-xl">Get ready!</p>
        </div>
        {chatOverlay}
      </>
    )
  }

  // QUESTION
  if (phase === 'QUESTION' && question) {
    if (question.questionType === 'SPELLING') {
      return (
        <>
          <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-8">
            <div className="w-full max-w-md">
              <div className="text-center mb-4 text-sm md:text-base text-slate-400">
                Question {question.questionIndex + 1} of {question.totalQuestions}
              </div>
              <div className="mb-6 md:mb-8">
                <SpellingAudio word={question.word || ''} hint={question.hint || undefined} autoPlay={true} />
              </div>
              {hasAnswered ? (
                <div className="text-center">
                  <div className="text-3xl md:text-4xl mb-4">✓</div>
                  <p className="text-green-400 text-lg md:text-xl">Answer submitted!</p>
                  <p className="text-slate-400 mt-2 text-sm md:text-base">You spelled: {spellingAnswer}</p>
                </div>
              ) : (
                <SpellingInput wordLength={question.wordLength || 0} onSubmit={handleSpellingAnswer} timeLeft={timeLeft} />
              )}
            </div>
          </div>
          {chatOverlay}
        </>
      )
    }

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

  // PENALTY_KICK
  if (phase === 'PENALTY_KICK') {
    return (
      <>
        <PenaltyKick
          quizCorrect={penaltyQuizCorrect}
          onKick={handleKick}
          hasKicked={hasKicked}
          result={penaltyResult}
          timeLeftMs={penaltyTimeLeftMs}
        />
        {chatOverlay}
      </>
    )
  }

  // REVEAL
  if (phase === 'REVEAL') {
    // If we have a penalty result, show it with the soccer penalty animation
    if (penaltyResult && !penaltyResult.points && myResult?.penaltyResult) {
      // Show the PenaltyKick component in result state (animation already played)
      return (
        <>
          <PenaltyKick
            quizCorrect={penaltyQuizCorrect}
            onKick={handleKick}
            hasKicked={hasKicked}
            result={penaltyResult}
            timeLeftMs={0}
          />
          {chatOverlay}
        </>
      )
    }

    // Default reveal with soccer theming
    return (
      <>
        <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-b from-green-800 to-green-950">
          {myResult?.penaltyResult ? (
            // Soccer reveal: show penalty result
            <>
              <div className={`mb-4 text-6xl md:text-7xl ${
                myResult.penaltyResult === 'goal' ? 'text-yellow-300' :
                myResult.penaltyResult === 'save' ? 'text-orange-400' : 'text-red-400'
              }`}>
                {myResult.penaltyResult === 'goal' ? '⚽' : myResult.penaltyResult === 'save' ? '🧤' : '💨'}
              </div>
              <h1 className="mb-4 text-3xl md:text-4xl font-black text-white">
                {myResult.penaltyResult === 'goal' ? 'GOAL!' :
                 myResult.penaltyResult === 'save' ? 'SAVED!' : 'MISS!'}
              </h1>
              <p className={`text-2xl md:text-3xl font-bold ${myResult.points > 0 ? 'text-yellow-300' : 'text-white/50'}`}>
                +{myResult.points} points
              </p>
              {!myResult.isCorrect && (
                <p className="mt-2 text-white/50 text-sm">Wrong answer = automatic miss</p>
              )}
            </>
          ) : (
            // Fallback reveal
            <>
              <div className={`mb-6 text-6xl md:text-8xl ${myResult?.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                {myResult?.isCorrect ? '✓' : '✗'}
              </div>
              <h1 className="mb-4 text-2xl md:text-3xl font-bold text-white">
                {myResult?.isCorrect ? 'Correct!' : 'Wrong!'}
              </h1>
              {myResult && (
                <p className="text-xl md:text-2xl text-white/70">+{myResult.points} points</p>
              )}
            </>
          )}
        </div>
        {chatOverlay}
      </>
    )
  }

  // LEADERBOARD
  if (phase === 'LEADERBOARD') {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-b from-green-700 to-green-900 p-4 md:p-8 text-white">
          <h1 className="mb-6 md:mb-8 text-center text-2xl md:text-3xl font-bold">Leaderboard</h1>
          <div className="mx-auto max-w-md space-y-2 md:space-y-3">
            {leaderboard.map((player, index) => (
              <div
                key={player.playerId}
                className={`flex items-center justify-between rounded-lg p-3 md:p-4 ${
                  player.playerId === playerId ? 'bg-white text-green-900' : 'bg-green-800'
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
          <p className="mt-6 md:mt-8 text-center text-green-200 text-sm md:text-base">
            Waiting for next question...
          </p>
        </div>
        {chatOverlay}
      </>
    )
  }

  // END
  if (phase === 'END') {
    const winner = leaderboard[0]
    const myRank = leaderboard.findIndex((p) => p.playerId === playerId) + 1
    const isWinner = myRank === 1

    return (
      <>
        <div className="min-h-screen bg-gradient-to-b from-yellow-500 to-green-600 p-4 md:p-8 text-white">
          <div className="mb-6 md:mb-8 text-center">
            <div className="text-6xl md:text-8xl">{isWinner ? '🏆' : '⚽'}</div>
            <h1 className="mt-4 text-3xl md:text-4xl font-bold">Full Time!</h1>
          </div>

          {isWinner ? (
            <p className="mb-4 text-center text-xl md:text-2xl">You won!</p>
          ) : (
            <p className="mb-4 text-center text-lg md:text-2xl">
              {winner?.nickname} wins with {winner?.score} points!
            </p>
          )}

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
                  player.playerId === playerId ? 'bg-white text-green-900' : 'bg-green-700'
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
              onClick={() => (window.location.href = '/games/soccer/join')}
              className="bg-white text-green-600 hover:bg-green-100"
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
    <div className="flex min-h-screen items-center justify-center bg-green-900">
      <p className="text-white">Loading...</p>
    </div>
  )
}

/**
 * Chat overlay wrapper — same as quiz page.
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
