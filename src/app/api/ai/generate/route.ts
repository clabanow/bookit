/**
 * AI Question Generation API
 *
 * POST /api/ai/generate
 *
 * Accepts either:
 * 1. An image (base64) - extracts content and generates questions
 * 2. Text content - generates questions directly
 *
 * Returns generated questions that can be saved as a question set.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isAIAvailable } from '@/lib/ai/client'
import { extractContentFromImage, type ExtractedContent } from '@/lib/ai/vision'
import { generateQuestions, generateQuestionsFromText, type GenerateOptions } from '@/lib/ai/questionGenerator'
import { getAiUsage, recordAiGeneration } from '@/lib/limits/usage'

export const dynamic = 'force-dynamic'

// Max image size: 10MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024

interface GenerateRequest {
  // Either provide an image...
  image?: {
    data: string // Base64 encoded image
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  }
  // ...or text content
  text?: string
  contentType?: ExtractedContent['contentType']

  // Generation options
  questionType: 'MULTIPLE_CHOICE' | 'SPELLING' | 'MIXED'
  count?: number
  difficulty?: 'easy' | 'medium' | 'hard'
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (session.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Account not approved' }, { status: 403 })
    }

    // Check if AI is available
    if (!isAIAvailable()) {
      return NextResponse.json(
        { error: 'AI features are not configured. Please add ANTHROPIC_API_KEY to your environment.' },
        { status: 503 }
      )
    }

    // Check daily AI generation limit
    const usage = await getAiUsage(session.userId)
    if (!usage.allowed) {
      return NextResponse.json(
        { error: `Daily AI limit reached (${usage.limit}/day). Try again tomorrow.`, usage },
        { status: 429 }
      )
    }

    const body = (await request.json()) as GenerateRequest

    // Validate input
    if (!body.image && !body.text) {
      return NextResponse.json(
        { error: 'Either image or text content is required' },
        { status: 400 }
      )
    }

    if (!body.questionType) {
      return NextResponse.json({ error: 'Question type is required' }, { status: 400 })
    }

    const options: GenerateOptions = {
      questionType: body.questionType,
      count: body.count,
      difficulty: body.difficulty,
    }

    let extractedContent: ExtractedContent | null = null

    // Process image if provided
    if (body.image) {
      // Validate image size (base64 is ~33% larger than binary)
      const estimatedSize = (body.image.data.length * 3) / 4
      if (estimatedSize > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: 'Image too large. Maximum size is 10MB.' }, { status: 400 })
      }

      // Extract content from image
      extractedContent = await extractContentFromImage(body.image.data, body.image.mediaType)
    }

    // Generate questions
    let questions
    if (extractedContent) {
      questions = await generateQuestions(extractedContent, options)
    } else if (body.text) {
      questions = await generateQuestionsFromText(
        body.text,
        body.contentType || 'general',
        options
      )
    } else {
      return NextResponse.json({ error: 'No content to generate from' }, { status: 400 })
    }

    // Record this generation for usage tracking (only after success)
    await recordAiGeneration(session.userId)

    return NextResponse.json({
      success: true,
      extractedContent: extractedContent || { contentType: body.contentType || 'general', items: [], rawText: body.text || '' },
      questions,
      usage: await getAiUsage(session.userId),
    })
  } catch (error) {
    console.error('AI generation error:', error)

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('ANTHROPIC_API_KEY')) {
        return NextResponse.json({ error: error.message }, { status: 503 })
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'AI rate limit reached. Please try again in a moment.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 })
  }
}
