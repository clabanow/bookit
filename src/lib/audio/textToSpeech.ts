/**
 * Text-to-Speech Utility
 *
 * Uses the Web Speech API to speak words aloud for spelling mode.
 * This runs entirely in the browser - no server or API calls needed!
 *
 * The Web Speech API is supported in all modern browsers:
 * - Chrome, Edge, Safari, Firefox all support it
 * - Mobile browsers also support it
 */

/**
 * Check if text-to-speech is supported in this browser
 */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * Speak a word aloud
 *
 * @param word - The word to speak
 * @param options - Optional settings for speech
 * @returns Promise that resolves when speech finishes
 */
export function speakWord(
  word: string,
  options?: {
    rate?: number // Speed: 0.1-10, default 0.8 (slightly slower for clarity)
    pitch?: number // Pitch: 0-2, default 1
    volume?: number // Volume: 0-1, default 1
    voice?: SpeechSynthesisVoice // Specific voice to use
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isSpeechSupported()) {
      reject(new Error('Text-to-speech is not supported in this browser'))
      return
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(word)

    // Apply options
    utterance.rate = options?.rate ?? 0.8 // Slightly slower for spelling
    utterance.pitch = options?.pitch ?? 1
    utterance.volume = options?.volume ?? 1

    if (options?.voice) {
      utterance.voice = options.voice
    }

    // Handle completion
    utterance.onend = () => resolve()
    utterance.onerror = (event) => reject(new Error(`Speech error: ${event.error}`))

    // Speak!
    window.speechSynthesis.speak(utterance)
  })
}

/**
 * Get available voices
 *
 * Note: Voices are loaded asynchronously, so this might return
 * an empty array on first call. Use getVoicesAsync for reliable results.
 */
export function getVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return []
  return window.speechSynthesis.getVoices()
}

/**
 * Get available voices (async - waits for voices to load)
 */
export function getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) {
      resolve([])
      return
    }

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      resolve(voices)
      return
    }

    // Wait for voices to load
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices())
    }
  })
}

/**
 * Get a good default voice for English
 */
export async function getEnglishVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = await getVoicesAsync()

  // Prefer certain high-quality voices
  const preferredVoices = [
    'Google US English',
    'Google UK English Female',
    'Samantha', // macOS
    'Microsoft Zira', // Windows
  ]

  for (const preferred of preferredVoices) {
    const voice = voices.find((v) => v.name.includes(preferred))
    if (voice) return voice
  }

  // Fall back to any English voice
  const englishVoice = voices.find((v) => v.lang.startsWith('en'))
  if (englishVoice) return englishVoice

  // Fall back to default
  return voices[0] || null
}

/**
 * Stop any ongoing speech
 */
export function stopSpeech(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel()
  }
}
