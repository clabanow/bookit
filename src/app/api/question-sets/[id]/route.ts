/**
 * Individual Question Set API Routes
 *
 * GET    /api/question-sets/[id]  - Get a single question set with its questions
 * PUT    /api/question-sets/[id]  - Update a question set and its questions
 * DELETE /api/question-sets/[id]  - Delete a question set
 *
 * The [id] in the folder name is a dynamic route parameter.
 * Next.js passes it via the params object.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/question-sets/[id]
 *
 * Returns a single question set with all its questions.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const questionSet = await prisma.questionSet.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!questionSet) {
      return NextResponse.json(
        { error: 'Question set not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(questionSet)
  } catch (error) {
    console.error('Error fetching question set:', error)
    return NextResponse.json(
      { error: 'Failed to fetch question set' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/question-sets/[id]
 *
 * Updates a question set. Can update title and/or replace all questions.
 *
 * Request body:
 * {
 *   title?: string,
 *   questions?: Array<{
 *     id?: string,        // Include if updating existing question
 *     prompt: string,
 *     options: string[],
 *     correctIndex: number,
 *     timeLimitSec?: number
 *   }>
 * }
 *
 * Note: If questions array is provided, it REPLACES all existing questions.
 * This is simpler than trying to diff/merge changes.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check if set exists
    const existing = await prisma.questionSet.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Question set not found' },
        { status: 404 }
      )
    }

    // Validate title if provided
    if (body.title !== undefined) {
      const title = body.title?.trim()
      if (!title || title.length === 0 || title.length > 100) {
        return NextResponse.json(
          { error: 'Title must be 1-100 characters' },
          { status: 400 }
        )
      }
    }

    // Validate questions if provided
    if (body.questions !== undefined) {
      if (!Array.isArray(body.questions)) {
        return NextResponse.json(
          { error: 'Questions must be an array' },
          { status: 400 }
        )
      }

      for (const q of body.questions) {
        if (!q.prompt) {
          return NextResponse.json(
            { error: 'Each question needs a prompt' },
            { status: 400 }
          )
        }

        const qType = q.questionType ?? 'MULTIPLE_CHOICE'

        if (qType === 'MULTIPLE_CHOICE') {
          // MC questions need 4 options and a valid correctIndex
          if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
            return NextResponse.json(
              { error: 'Multiple choice questions must have exactly 4 options' },
              { status: 400 }
            )
          }
          if (q.correctIndex === undefined || q.correctIndex < 0 || q.correctIndex > 3) {
            return NextResponse.json(
              { error: 'correctIndex must be 0-3 for multiple choice questions' },
              { status: 400 }
            )
          }
        } else if (qType === 'SPELLING') {
          // Spelling questions need an answer word
          if (!q.answer || typeof q.answer !== 'string' || !q.answer.trim()) {
            return NextResponse.json(
              { error: 'Spelling questions must have an answer word' },
              { status: 400 }
            )
          }
        }
      }
    }

    // Use a transaction to update set and replace questions atomically
    const updated = await prisma.$transaction(async (tx) => {
      // Update the set title if provided
      if (body.title !== undefined) {
        await tx.questionSet.update({
          where: { id },
          data: { title: body.title.trim() },
        })
      }

      // Replace questions if provided
      if (body.questions !== undefined) {
        // Delete all existing questions
        await tx.question.deleteMany({
          where: { setId: id },
        })

        // Create new questions
        if (body.questions.length > 0) {
          await tx.question.createMany({
            data: body.questions.map(
              (
                q: {
                  prompt: string
                  questionType?: 'MULTIPLE_CHOICE' | 'SPELLING'
                  options?: string[]
                  correctIndex?: number
                  answer?: string
                  hint?: string
                  timeLimitSec?: number
                },
                index: number
              ) => ({
                setId: id,
                prompt: q.prompt,
                questionType: q.questionType ?? 'MULTIPLE_CHOICE',
                options: q.options ?? [],
                correctIndex: q.correctIndex ?? 0,
                answer: q.answer ?? null,
                hint: q.hint ?? null,
                timeLimitSec: q.timeLimitSec ?? (q.questionType === 'SPELLING' ? 30 : 20),
                order: index,
              })
            ),
          })
        }
      }

      // Return the updated set with questions
      return tx.questionSet.findUnique({
        where: { id },
        include: {
          questions: {
            orderBy: { order: 'asc' },
          },
        },
      })
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating question set:', error)
    return NextResponse.json(
      { error: 'Failed to update question set' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/question-sets/[id]
 *
 * Deletes a question set and all its questions.
 * The cascade delete is configured in the Prisma schema.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    // Check if set exists
    const existing = await prisma.questionSet.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Question set not found' },
        { status: 404 }
      )
    }

    await prisma.questionSet.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting question set:', error)
    return NextResponse.json(
      { error: 'Failed to delete question set' },
      { status: 500 }
    )
  }
}
