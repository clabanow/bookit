/**
 * PenaltyKick Component
 *
 * The penalty kick mini-game for Soccer Stud mode.
 * Shows a front-facing view of a soccer goal with a kicker and goalie.
 *
 * Animation states (derived from props, not stored in state):
 * 1. choosing — correct players pick left/center/right target zone (8s timer)
 * 2. kicking — ball flight + goalie dive animation (1.4s)
 * 3. result — GOAL/SAVED/MISS overlay with points
 *
 * Wrong answers auto-play a miss animation with no interaction.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

type KickDirection = 'left' | 'center' | 'right'
type MissType = 'sky_high' | 'wide_left' | 'wide_right' | 'hit_post'
type PenaltyResultType = 'goal' | 'save' | 'miss'

export interface PenaltyResult {
  penaltyResult: PenaltyResultType
  missType?: MissType
  goalieDirection?: KickDirection
  kickDirection?: KickDirection
  points: number
}

interface PenaltyKickProps {
  /** Did the player get the quiz question right? */
  quizCorrect: boolean
  /** Callback when player chooses a direction */
  onKick: (direction: KickDirection) => void
  /** Whether the server confirmed the kick */
  hasKicked: boolean
  /** Result from the server (null while waiting) */
  result: PenaltyResult | null
  /** Time remaining to choose (ms) */
  timeLeftMs: number
}

type AnimState = 'choosing' | 'kicking' | 'result'

export function PenaltyKick({
  quizCorrect,
  onKick,
  hasKicked,
  result,
  timeLeftMs,
}: PenaltyKickProps) {
  // showResult flips to true after the 1.4s kick animation completes.
  // animState is *derived* from result + showResult (no synchronous setState in effects).
  const [showResult, setShowResult] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // When result arrives, start a timer to flip showResult after the kick animation.
  // result transitions from null → PenaltyResult exactly once, and showResult starts
  // false, so we only need the setTimeout to flip it to true.
  useEffect(() => {
    if (!result) return

    timerRef.current = setTimeout(() => {
      setShowResult(true)
    }, 1400)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [result])

  // Derive animation state from props (no useState needed)
  const animState: AnimState = !result
    ? 'choosing'
    : showResult
      ? 'result'
      : 'kicking'

  const handleKick = useCallback(
    (dir: KickDirection) => {
      if (hasKicked || !quizCorrect) return
      onKick(dir)
    },
    [hasKicked, quizCorrect, onKick]
  )

  const timeLeftSec = Math.max(0, Math.ceil(timeLeftMs / 1000))

  // Determine ball animation class
  const getBallAnimation = (): string => {
    if (animState !== 'kicking' || !result) return ''
    if (result.penaltyResult === 'miss') {
      switch (result.missType) {
        case 'wide_left': return 'animate-miss-wide-left'
        case 'wide_right': return 'animate-miss-wide-right'
        case 'hit_post': return 'animate-miss-hit-post'
        default: return 'animate-miss-sky-high'
      }
    }
    // Goal or save — ball goes toward the chosen direction
    switch (result.kickDirection) {
      case 'left': return 'animate-kick-left'
      case 'right': return 'animate-kick-right'
      default: return 'animate-kick-center'
    }
  }

  // Determine goalie animation class
  const getGoalieAnimation = (): string => {
    if (animState !== 'kicking' || !result) return ''
    if (result.penaltyResult === 'miss') return '' // No dive for misses
    switch (result.goalieDirection) {
      case 'left': return 'animate-goalie-dive-left'
      case 'right': return 'animate-goalie-dive-right'
      default: return 'animate-goalie-dive-center'
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-green-700 to-green-900 p-4 select-none">
      {/* Timer (only during choosing phase) */}
      {animState === 'choosing' && quizCorrect && !hasKicked && (
        <div className="mb-4 text-center">
          <p className="text-white/80 text-sm mb-1">Choose where to shoot!</p>
          <span className={`text-3xl font-bold ${timeLeftSec <= 3 ? 'text-red-400' : 'text-white'}`}>
            {timeLeftSec}s
          </span>
        </div>
      )}

      {/* Wrong answer message */}
      {!quizCorrect && animState === 'choosing' && (
        <div className="mb-4 text-center">
          <p className="text-red-400 text-lg font-bold">Wrong answer!</p>
          <p className="text-white/60 text-sm">Automatic miss...</p>
        </div>
      )}

      {/* Kicked waiting message */}
      {hasKicked && animState === 'choosing' && (
        <div className="mb-4 text-center">
          <p className="text-yellow-300 text-lg font-bold">Kick submitted!</p>
          <p className="text-white/60 text-sm">Waiting for others...</p>
        </div>
      )}

      {/* Goal / field area */}
      <div className="relative w-full max-w-sm aspect-[4/3]">
        {/* Goal frame */}
        <div className="absolute inset-x-[10%] top-[5%] bottom-[40%] border-4 border-white rounded-t-lg overflow-hidden">
          {/* Net pattern */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'linear-gradient(45deg, white 1px, transparent 1px), linear-gradient(-45deg, white 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />

          {/* Goal net bulge on goal */}
          {showResult && result?.penaltyResult === 'goal' && (
            <div className="absolute inset-0 bg-white/10 animate-net-bulge" />
          )}

          {/* Target zones (only when choosing and quiz correct) */}
          {animState === 'choosing' && quizCorrect && !hasKicked && (
            <div className="absolute inset-0 flex">
              {(['left', 'center', 'right'] as KickDirection[]).map((dir) => (
                <button
                  key={dir}
                  onClick={() => handleKick(dir)}
                  className="flex-1 border border-dashed border-yellow-400/50 hover:bg-yellow-400/20 active:bg-yellow-400/30 transition-colors flex items-center justify-center"
                >
                  <span className="text-2xl">
                    {dir === 'left' ? '⬅️' : dir === 'right' ? '➡️' : '⬆️'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Goalie */}
          <div
            className={`absolute bottom-[10%] left-1/2 -translate-x-1/2 text-4xl transition-transform ${getGoalieAnimation()}`}
          >
            🧤
          </div>
        </div>

        {/* Penalty spot + ball */}
        <div className={`absolute bottom-[15%] left-1/2 -translate-x-1/2 text-3xl ${getBallAnimation()}`}>
          ⚽
        </div>

        {/* Kicker */}
        <div
          className={`absolute bottom-[5%] left-1/2 -translate-x-1/2 text-3xl ${
            animState === 'kicking' ? 'animate-kicker-run-kick' :
            showResult && result?.penaltyResult === 'goal' ? 'animate-kicker-celebrate' :
            showResult && result?.penaltyResult !== 'goal' ? 'animate-kicker-collapse' : ''
          }`}
        >
          🏃
        </div>

        {/* Field lines */}
        <div className="absolute bottom-[30%] left-[5%] right-[5%] border-t-2 border-white/20" />
      </div>

      {/* Result overlay */}
      {showResult && result && (
        <div className="mt-6 text-center animate-fade-in">
          <div className={`text-5xl md:text-6xl font-black mb-2 ${
            result.penaltyResult === 'goal'
              ? 'text-yellow-300'
              : result.penaltyResult === 'save'
                ? 'text-orange-400'
                : 'text-red-400'
          }`}>
            {result.penaltyResult === 'goal'
              ? 'GOAL!'
              : result.penaltyResult === 'save'
                ? 'SAVED!'
                : 'MISS!'}
          </div>
          <p className={`text-2xl font-bold ${result.points > 0 ? 'text-yellow-300' : 'text-white/50'}`}>
            +{result.points} points
          </p>
        </div>
      )}
    </div>
  )
}
