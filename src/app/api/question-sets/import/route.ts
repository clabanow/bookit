/**
 * Question Set Import API
 *
 * POST /api/question-sets/import - Import a question set from JSON
 *
 * Accepts the export format and creates a new question set.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { ExportedQuestionSet } from '../[id]/export/route'

/**
 * POST /api/question-sets/import
 *
 * Imports a question set from the portable JSON format.
 * Creates a new question set (does not overwrite existing).
 *
 * Request body: ExportedQuestionSet
 *
 * Returns: The created question set with its new ID
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExportedQuestionSet

    // Validate format version
    if (body.version !== 1) {
      return NextResponse.json(
        { error: 'Unsupported format version. Expected version 1.' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body.questionSet) {
      return NextResponse.json({ error: 'Missing questionSet in import data' }, { status: 400 })
    }

    const { title, questions } = body.questionSet

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Question set must have a title' }, { status: 400 })
    }

    if (title.length > 100) {
      return NextResponse.json({ error: 'Title must be 100 characters or less' }, { status: 400 })
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: 'Question set must have at least one question' },
        { status: 400 }
      )
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]

      if (!q.prompt || typeof q.prompt !== 'string' || q.prompt.trim().length === 0) {
        return NextResponse.json({ error: `Question ${i + 1}: prompt is required` }, { status: 400 })
      }

      if (q.prompt.length > 500) {
        return NextResponse.json(
          { error: `Question ${i + 1}: prompt must be 500 characters or less` },
          { status: 400 }
        )
      }

      if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
        return NextResponse.json(
          { error: `Question ${i + 1}: must have exactly 4 options` },
          { status: 400 }
        )
      }

      for (let j = 0; j < q.options.length; j++) {
        const opt = q.options[j]
        if (typeof opt !== 'string' || opt.trim().length === 0) {
          return NextResponse.json(
            { error: `Question ${i + 1}, Option ${j + 1}: must be a non-empty string` },
            { status: 400 }
          )
        }
        if (opt.length > 200) {
          return NextResponse.json(
            { error: `Question ${i + 1}, Option ${j + 1}: must be 200 characters or less` },
            { status: 400 }
          )
        }
      }

      if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
        return NextResponse.json(
          { error: `Question ${i + 1}: correctIndex must be 0-3` },
          { status: 400 }
        )
      }

      if (q.timeLimitSec !== undefined) {
        if (typeof q.timeLimitSec !== 'number' || q.timeLimitSec < 5 || q.timeLimitSec > 120) {
          return NextResponse.json(
            { error: `Question ${i + 1}: timeLimitSec must be 5-120` },
            { status: 400 }
          )
        }
      }
    }

    // Create the question set with all questions
    const created = await prisma.questionSet.create({
      data: {
        title: title.trim(),
        questions: {
          create: questions.map((q, index) => ({
            prompt: q.prompt.trim(),
            options: q.options.map((o) => o.trim()),
            correctIndex: q.correctIndex,
            timeLimitSec: q.timeLimitSec ?? 20,
            order: index,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Error importing question set:', error)

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to import question set' }, { status: 500 })
  }
}
