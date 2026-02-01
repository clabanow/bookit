/**
 * Question Sets API Routes
 *
 * GET  /api/question-sets     - List all question sets
 * POST /api/question-sets     - Create a new question set
 *
 * Next.js Route Handlers:
 * - Export functions named after HTTP methods (GET, POST, etc.)
 * - They receive a Request object and return a Response
 * - NextResponse.json() is a helper to return JSON responses
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/question-sets
 *
 * Returns all question sets with their question count.
 * In the future, this would filter by the authenticated user's ownerId.
 */
export async function GET() {
  try {
    const sets = await prisma.questionSet.findMany({
      include: {
        _count: {
          select: { questions: true },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // Transform to include questionCount as a simple number
    const response = sets.map((set) => ({
      id: set.id,
      title: set.title,
      questionCount: set._count.questions,
      createdAt: set.createdAt,
      updatedAt: set.updatedAt,
    }))

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching question sets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch question sets' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/question-sets
 *
 * Creates a new question set.
 *
 * Request body:
 * {
 *   title: string,
 *   questions?: Array<{
 *     prompt: string,
 *     options: string[],
 *     correctIndex: number,
 *     timeLimitSec?: number
 *   }>
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const title = body.title.trim()
    if (title.length === 0 || title.length > 100) {
      return NextResponse.json(
        { error: 'Title must be 1-100 characters' },
        { status: 400 }
      )
    }

    // Create the question set with optional questions
    const questionSet = await prisma.questionSet.create({
      data: {
        title,
        // If questions are provided, create them too
        questions: body.questions
          ? {
              create: body.questions.map(
                (
                  q: {
                    prompt: string
                    questionType?: 'MULTIPLE_CHOICE' | 'SPELLING'
                    options?: string[]
                    correctIndex?: number
                    answer?: string
                    hint?: string
                    timeLimitSec?: number
                    order?: number
                  },
                  index: number
                ) => ({
                  prompt: q.prompt,
                  questionType: q.questionType ?? 'MULTIPLE_CHOICE',
                  options: q.options ?? [],
                  correctIndex: q.correctIndex ?? 0,
                  answer: q.answer ?? null,
                  hint: q.hint ?? null,
                  timeLimitSec: q.timeLimitSec ?? (q.questionType === 'SPELLING' ? 30 : 20),
                  order: q.order ?? index,
                })
              ),
            }
          : undefined,
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json(questionSet, { status: 201 })
  } catch (error) {
    console.error('Error creating question set:', error)
    return NextResponse.json(
      { error: 'Failed to create question set' },
      { status: 500 }
    )
  }
}
