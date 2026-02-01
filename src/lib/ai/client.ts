/**
 * Anthropic AI Client
 *
 * Singleton instance of the Anthropic client for AI features.
 * Used for:
 * - Vision: Extracting text from homework/vocab images
 * - Generation: Creating quiz questions from extracted content
 */

import Anthropic from '@anthropic-ai/sdk'

// Singleton client instance
let client: Anthropic | null = null

/**
 * Get the Anthropic client
 * Creates a new instance if one doesn't exist
 */
export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is required for AI features. ' +
          'Get your API key from https://console.anthropic.com/'
      )
    }

    client = new Anthropic({ apiKey })
  }

  return client
}

/**
 * Check if AI features are available
 */
export function isAIAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}
