/**
 * Question View Component
 *
 * Displays the current question and answer options.
 * Shows a countdown timer and lets players select an answer.
 *
 * The timer is visual only - the server manages the actual time limit.
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface QuestionViewProps {
  prompt: string
  options: string[]
  timeLimitSec: number
  startedAt: number
  onAnswer: (answerIndex: number) => void
  hasAnswered: boolean
  selectedAnswer: number | null
}

// Colors for the answer buttons (Kahoot-style)
const OPTION_COLORS = [
  'bg-red-500 hover:bg-red-600',
  'bg-blue-500 hover:bg-blue-600',
  'bg-yellow-500 hover:bg-yellow-600',
  'bg-green-500 hover:bg-green-600',
]

export function QuestionView({
  prompt,
  options,
  timeLimitSec,
  startedAt,
  onAnswer,
  hasAnswered,
  selectedAnswer,
}: QuestionViewProps) {
  const [timeLeft, setTimeLeft] = useState(timeLimitSec)

  // Update timer every 100ms for smooth countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000
      const remaining = Math.max(0, timeLimitSec - elapsed)
      setTimeLeft(remaining)
    }, 100)

    return () => clearInterval(interval)
  }, [startedAt, timeLimitSec])

  // Calculate timer bar width
  const timerPercent = (timeLeft / timeLimitSec) * 100

  return (
    <div className="flex min-h-screen flex-col bg-purple-900 p-4 text-white">
      {/* Timer bar */}
      <div
        role="progressbar"
        aria-valuenow={Math.ceil(timeLeft)}
        aria-valuemin={0}
        aria-valuemax={timeLimitSec}
        aria-label={`Time remaining: ${Math.ceil(timeLeft)} seconds`}
        className="mb-4 h-2 w-full overflow-hidden rounded-full bg-purple-700"
      >
        <div
          className="h-full bg-white transition-all duration-100"
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      {/* Time remaining - hidden from screen readers since progressbar handles it */}
      <div className="mb-4 text-center text-xl md:text-2xl font-bold" aria-hidden="true">
        {Math.ceil(timeLeft)}s
      </div>

      {/* Question */}
      <div className="mb-6 md:mb-8 rounded-lg bg-white p-4 md:p-6 text-center">
        <h2 className="text-lg md:text-xl font-bold text-gray-900">{prompt}</h2>
      </div>

      {/* Answer options */}
      {hasAnswered ? (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-1 items-center justify-center"
        >
          <div className="text-center">
            <div className="mb-4 text-5xl md:text-6xl" aria-hidden="true">
              ✓
            </div>
            <p className="text-lg md:text-xl">Answer submitted!</p>
            <p className="text-purple-300 text-sm md:text-base">Waiting for time to run out...</p>
          </div>
        </div>
      ) : (
        <div
          role="group"
          aria-label="Answer options"
          className="grid flex-1 grid-cols-2 gap-2 md:gap-3"
        >
          {options.map((option, index) => (
            <Button
              key={index}
              onClick={() => onAnswer(index)}
              disabled={hasAnswered}
              aria-label={`Answer ${index + 1}: ${option}`}
              className={`h-full min-h-20 md:min-h-24 text-base md:text-lg font-bold text-white ${
                selectedAnswer === index
                  ? 'ring-4 ring-white'
                  : OPTION_COLORS[index]
              }`}
            >
              {option}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
