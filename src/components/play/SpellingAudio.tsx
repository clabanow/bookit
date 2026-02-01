'use client'

/**
 * Spelling Audio Component
 *
 * Displays a speaker button that pronounces the word when clicked.
 * Used in spelling mode to read the word that players need to spell.
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { speakWord, isSpeechSupported, getEnglishVoice, stopSpeech } from '@/lib/audio/textToSpeech'

interface SpellingAudioProps {
  word: string
  autoPlay?: boolean // Auto-play when component mounts
  hint?: string // Optional hint to display
  showHint?: boolean // Whether to show the hint
}

export function SpellingAudio({ word, autoPlay = true, hint, showHint = true }: SpellingAudioProps) {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(true)
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null)

  // Load voice on mount
  useEffect(() => {
    setSupported(isSpeechSupported())

    async function loadVoice() {
      const englishVoice = await getEnglishVoice()
      setVoice(englishVoice)
    }

    if (isSpeechSupported()) {
      loadVoice()
    }
  }, [])

  const handleSpeak = useCallback(async () => {
    if (speaking) return

    setSpeaking(true)
    try {
      await speakWord(word, { voice: voice || undefined })
    } catch (error) {
      console.error('Speech error:', error)
    } finally {
      setSpeaking(false)
    }
  }, [word, voice, speaking])

  // Auto-play on mount
  useEffect(() => {
    if (autoPlay && supported && voice) {
      // Small delay to ensure component is visible
      const timer = setTimeout(() => {
        handleSpeak()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [autoPlay, supported, voice, handleSpeak])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech()
    }
  }, [])

  if (!supported) {
    return (
      <div className="text-center p-6">
        <p className="text-red-400 mb-2">Speech not supported in this browser</p>
        <p className="text-slate-400">The word is: <strong>{word}</strong></p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Big speaker button */}
      <Button
        onClick={handleSpeak}
        disabled={speaking}
        size="lg"
        className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
      >
        <span className="text-5xl" role="img" aria-label="Play sound">
          {speaking ? '🔊' : '🔈'}
        </span>
      </Button>

      <p className="text-slate-400 text-sm">
        {speaking ? 'Playing...' : 'Tap to hear the word'}
      </p>

      {/* Hint display */}
      {showHint && hint && (
        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <p className="text-sm text-slate-400">
            <span className="text-yellow-400">Hint:</span> {hint}
          </p>
        </div>
      )}
    </div>
  )
}
