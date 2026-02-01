/**
 * Player Game Page
 *
 * The main game view for players. Handles all game phases:
 * - LOBBY: Waiting for host to start
 * - COUNTDOWN: 3-2-1 before question
 * - QUESTION: Answering the question
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
import { Button } from '@/components/ui/button'

type GamePhase = 'LOBBY' | 'COUNTDOWN' | 'QUESTION' | 'REVEAL' | 'LEADERBOARD' | 'END'

interface QuestionData {
  prompt: string
  options: string[]
  timeLimitSec: number
  startedAt: number
  questionIndex: number
  totalQuestions: number
}

interface RevealData {
  correctIndex: number
  results: Array<{
    playerId: string
    nickname: string
    answerIndex: number | null
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
  const [error, setError] = useState<string | null>(null)
  const [myResult, setMyResult] = useState<{ isCorrect: boolean; points: number } | null>(null)

  // Connect to socket and set up event listeners
  useEffect(() => {
    const socket = getSocket({ role: 'player' })

    // Check for stored player ID (for reconnection after refresh)
    const storedPlayerId = localStorage.getItem(`bookit_player_${sessionId}`)

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
        setQuestion({
          prompt: data.currentQuestion.prompt,
          options: data.currentQuestion.options,
          timeLimitSec: data.currentQuestion.timeLimitSec,
          startedAt: Date.now() - ((data.currentQuestion.timeLimitSec - (data.timeRemaining ?? 0)) * 1000),
          questionIndex: data.currentQuestion.questionIndex,
          totalQuestions: data.currentQuestion.totalQuestions,
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
      setPhase('QUESTION')
      setQuestion({
        prompt: data.prompt,
        options: data.options,
        timeLimitSec: data.timeLimitSec,
        startedAt: data.startedAt, // Server sends startedAt
        questionIndex: data.questionIndex,
        totalQuestions: data.totalQuestions,
      })
      setHasAnswered(false)
      setSelectedAnswer(null)
      setMyResult(null)
    })

    // Answer submitted confirmation
    socket.on('player:answer_confirmed', (data) => {
      console.log('Answer confirmed:', data)
      setHasAnswered(true)
      setSelectedAnswer(data.answerIndex)
    })

    // Reveal correct answer
    socket.on('game:reveal', (data) => {
      console.log('Reveal:', data)
      setPhase('REVEAL')
      setReveal({
        correctIndex: data.correctIndex,
        results: data.results,
      })
      // Find my result
      if (playerId) {
        const myResultData = data.results.find(
          (r) => r.playerId === playerId
        )
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
    socket.on('game:end', (data) => {
      console.log('Game ended:', data)
      setPhase('END')
      setLeaderboard(data.finalStandings)
    })

    // Error handling
    socket.on('error', (data) => {
      console.error('Game error:', data)
      setError(data.message)
    })

    // Handle being kicked by host
    socket.on('player:kicked', (data) => {
      const storedId = localStorage.getItem(`bookit_player_${sessionId}`)
      if (data.playerId === storedId || data.playerId === playerId) {
        console.log('You were kicked:', data.reason)
        localStorage.removeItem(`bookit_player_${sessionId}`)
        setError('You have been kicked from the game')
        disconnectSocket()
      }
    })

    // Store player ID from initial join or reconnection
    socket.on('player:joined', (data) => {
      setPlayerId(data.playerId)
      // Store in localStorage for reconnection after refresh
      localStorage.setItem(`bookit_player_${sessionId}`, data.playerId)
    })

    return () => {
      disconnectSocket()
    }
  }, [sessionId, playerId])

  // Handle answer submission
  const handleAnswer = useCallback(
    (answerIndex: number) => {
      if (hasAnswered) return

      const socket = getSocket({ role: 'player' })
      // Server identifies the player by socket.id, no playerId needed
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

  // Error display
  if (error) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex min-h-screen flex-col items-center justify-center bg-red-50 p-8"
      >
        <h1 className="mb-4 text-2xl font-bold text-red-600">Error</h1>
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  // LOBBY phase - waiting for game to start
  if (phase === 'LOBBY') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-600 to-purple-800 p-8 text-white">
        <div className="mb-8 text-6xl">🎮</div>
        <h1 className="mb-4 text-2xl font-bold">You&apos;re in!</h1>
        <p className="text-purple-200">Waiting for host to start the game...</p>
        <div className="mt-8 animate-pulse text-lg">Get ready!</div>
      </div>
    )
  }

  // COUNTDOWN phase - 3-2-1 before question
  if (phase === 'COUNTDOWN') {
    return (
      <div
        role="timer"
        aria-live="polite"
        aria-label={`Countdown: ${countdown} seconds`}
        className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-600 to-blue-800 p-8 text-white"
      >
        <div className="text-9xl font-bold" aria-hidden="true">
          {countdown}
        </div>
        <p className="mt-8 text-xl">Get ready!</p>
      </div>
    )
  }

  // QUESTION phase - answer the question
  if (phase === 'QUESTION' && question) {
    return (
      <QuestionView
        prompt={question.prompt}
        options={question.options}
        timeLimitSec={question.timeLimitSec}
        startedAt={question.startedAt}
        onAnswer={handleAnswer}
        hasAnswered={hasAnswered}
        selectedAnswer={selectedAnswer}
      />
    )
  }

  // REVEAL phase - show correct answer
  if (phase === 'REVEAL' && reveal) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div
          className={`mb-8 text-9xl ${myResult?.isCorrect ? 'text-green-500' : 'text-red-500'}`}
        >
          {myResult?.isCorrect ? '✓' : '✗'}
        </div>
        <h1 className="mb-4 text-3xl font-bold">
          {myResult?.isCorrect ? 'Correct!' : 'Wrong!'}
        </h1>
        {myResult && (
          <p className="text-2xl text-gray-600">+{myResult.points} points</p>
        )}
        <p className="mt-4 text-gray-500">
          Correct answer: {question?.options[reveal.correctIndex]}
        </p>
      </div>
    )
  }

  // LEADERBOARD phase - show standings
  if (phase === 'LEADERBOARD') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 to-purple-800 p-8 text-white">
        <h1 className="mb-8 text-center text-3xl font-bold">Leaderboard</h1>
        <div className="mx-auto max-w-md space-y-3">
          {leaderboard.map((player, index) => (
            <div
              key={player.playerId}
              className={`flex items-center justify-between rounded-lg p-4 ${
                player.playerId === playerId
                  ? 'bg-white text-purple-900'
                  : 'bg-purple-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">#{index + 1}</span>
                <span className="font-medium">{player.nickname}</span>
              </div>
              <span className="text-xl font-bold">{player.score}</span>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-purple-200">
          Waiting for next question...
        </p>
      </div>
    )
  }

  // END phase - game over
  if (phase === 'END') {
    const winner = leaderboard[0]
    const myRank = leaderboard.findIndex((p) => p.playerId === playerId) + 1
    const isWinner = myRank === 1

    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-500 to-orange-500 p-8 text-white">
        <div className="mb-8 text-center">
          <div className="text-8xl">{isWinner ? '🏆' : '🎉'}</div>
          <h1 className="mt-4 text-4xl font-bold">Game Over!</h1>
        </div>

        {isWinner ? (
          <p className="mb-8 text-center text-2xl">You won!</p>
        ) : (
          <p className="mb-8 text-center text-2xl">
            {winner?.nickname} wins with {winner?.score} points!
          </p>
        )}

        <div className="mx-auto max-w-md space-y-3">
          {leaderboard.slice(0, 5).map((player, index) => (
            <div
              key={player.playerId}
              className={`flex items-center justify-between rounded-lg p-4 ${
                player.playerId === playerId
                  ? 'bg-white text-orange-900'
                  : 'bg-orange-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </span>
                <span className="font-medium">{player.nickname}</span>
              </div>
              <span className="text-xl font-bold">{player.score}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button
            onClick={() => (window.location.href = '/join')}
            className="bg-white text-orange-600 hover:bg-orange-100"
          >
            Play Again
          </Button>
        </div>
      </div>
    )
  }

  // Fallback
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Loading...</p>
    </div>
  )
}
