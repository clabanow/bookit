/**
 * AI Question Generator
 *
 * Generates quiz questions from extracted content using Claude.
 * Supports both multiple choice and spelling question types.
 */

import { getAnthropicClient } from './client'
import type { ExtractedContent } from './vision'

export interface GeneratedQuestion {
  type: 'MULTIPLE_CHOICE' | 'SPELLING'
  prompt: string
  options?: string[] // For multiple choice (4 options)
  correctIndex?: number // For multiple choice (0-3)
  answer?: string // For spelling
  hint?: string // Optional hint
}

export interface GenerateOptions {
  questionType: 'MULTIPLE_CHOICE' | 'SPELLING' | 'MIXED'
  count?: number // Number of questions to generate (default: based on content)
  difficulty?: 'easy' | 'medium' | 'hard'
}

/**
 * Generate quiz questions from extracted content
 */
export async function generateQuestions(
  content: ExtractedContent,
  options: GenerateOptions
): Promise<GeneratedQuestion[]> {
  const client = getAnthropicClient()

  const { questionType, count = Math.min(content.items.length, 10), difficulty = 'medium' } = options

  // Build the prompt based on question type
  let typeInstructions = ''
  if (questionType === 'MULTIPLE_CHOICE') {
    typeInstructions = `
Generate MULTIPLE CHOICE questions only.
For each question, provide:
- A clear prompt/question
- Exactly 4 answer options (one correct, three plausible distractors)
- The index (0-3) of the correct answer`
  } else if (questionType === 'SPELLING') {
    typeInstructions = `
Generate SPELLING questions only.
For each question:
- The "prompt" should be a definition, description, or usage context for the word
- The "answer" is the word to spell correctly
- Include a helpful "hint" (like the first letter or number of syllables)`
  } else {
    typeInstructions = `
Generate a MIX of question types:
- Some MULTIPLE_CHOICE questions with 4 options
- Some SPELLING questions where the answer is typed`
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a quiz question generator for an educational game.

Content type: ${content.contentType}
Content items: ${JSON.stringify(content.items)}
Difficulty: ${difficulty}
Number of questions: ${count}

${typeInstructions}

Generate exactly ${count} questions based on this content.

Respond with a JSON array of questions in this exact format:
[
  {
    "type": "MULTIPLE_CHOICE",
    "prompt": "question text",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0
  },
  {
    "type": "SPELLING",
    "prompt": "definition or context clue",
    "answer": "word to spell",
    "hint": "starts with 'A'"
  }
]

Rules:
- Make questions clear and age-appropriate
- For multiple choice, make distractors plausible but clearly wrong
- For spelling, the prompt should NOT contain the answer word
- Difficulty affects how tricky the distractors are and hint helpfulness
- Only respond with the JSON array, no other text`,
      },
    ],
  })

  // Parse the response
  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from AI')
  }

  try {
    // Try to extract JSON from the response
    let jsonText = textContent.text.trim()

    // Handle case where response is wrapped in markdown code block
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }

    const questions = JSON.parse(jsonText) as GeneratedQuestion[]
    return questions
  } catch {
    console.error('Failed to parse AI response:', textContent.text)
    throw new Error('Failed to parse generated questions')
  }
}

/**
 * Generate questions directly from text (without vision extraction)
 */
export async function generateQuestionsFromText(
  text: string,
  contentType: ExtractedContent['contentType'],
  options: GenerateOptions
): Promise<GeneratedQuestion[]> {
  // Split text into items (by newlines or commas)
  const items = text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  const content: ExtractedContent = {
    contentType,
    items,
    rawText: text,
  }

  return generateQuestions(content, options)
}
