'use client'

/**
 * Spelling Input Component
 *
 * Text input for spelling mode where players type the word they heard.
 * Features:
 * - Shows letter count hint
 * - Auto-focuses on mount
 * - Submit on Enter key
 */

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface SpellingInputProps {
  wordLength: number // Number of letters in the word (for hint)
  onSubmit: (answer: string) => void
  disabled?: boolean
  timeLeft?: number // Seconds remaining
}

export function SpellingInput({ wordLength, onSubmit, disabled = false, timeLeft }: SpellingInputProps) {
  const [answer, setAnswer] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus on mount
  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus()
    }
  }, [disabled])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (answer.trim() && !disabled) {
      onSubmit(answer.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      {/* Timer display */}
      {timeLeft !== undefined && (
        <div className="text-center mb-4">
          <span
            className={`text-4xl font-bold ${
              timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'
            }`}
          >
            {timeLeft}s
          </span>
        </div>
      )}

      {/* Letter count hint */}
      <div className="text-center mb-4">
        <div className="flex justify-center gap-1">
          {Array.from({ length: wordLength }).map((_, i) => (
            <div
              key={i}
              className={`w-6 h-8 border-b-2 ${
                i < answer.length ? 'border-blue-500' : 'border-slate-600'
              }`}
            >
              <span className="text-lg font-mono text-white">
                {answer[i] || ''}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">{wordLength} letters</p>
      </div>

      {/* Input field */}
      <input
        ref={inputRef}
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={disabled}
        placeholder="Type your answer..."
        className="w-full px-4 py-3 text-center text-xl font-mono bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck="false"
      />

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full mt-4"
        size="lg"
        disabled={disabled || !answer.trim()}
      >
        {disabled ? 'Submitted!' : 'Submit Answer'}
      </Button>
    </form>
  )
}
