/**
 * Question Set Export API
 *
 * GET /api/question-sets/[id]/export - Export a question set as JSON
 *
 * Returns a clean JSON format without database IDs, suitable for:
 * - Backup
 * - Sharing with others
 * - Importing into another instance
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Exported question set format.
 * This is the portable format that can be imported elsewhere.
 */
export interface ExportedQuestionSet {
  /** Format version for future compatibility */
  version: 1
  /** Export metadata */
  exportedAt: string
  /** The question set data */
  questionSet: {
    title: string
    questions: Array<{
      prompt: string
      options: [string, string, string, string]
      correctIndex: number
      timeLimitSec: number
    }>
  }
}

/**
 * GET /api/question-sets/[id]/export
 *
 * Exports a question set in a portable JSON format.
 * The format excludes database IDs so it can be imported elsewhere.
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
      return NextResponse.json({ error: 'Question set not found' }, { status: 404 })
    }

    // Create portable export format (no database IDs)
    const exported: ExportedQuestionSet = {
      version: 1,
      exportedAt: new Date().toISOString(),
      questionSet: {
        title: questionSet.title,
        questions: questionSet.questions.map((q) => ({
          prompt: q.prompt,
          options: q.options as [string, string, string, string],
          correctIndex: q.correctIndex,
          timeLimitSec: q.timeLimitSec,
        })),
      },
    }

    // Return with filename header for download
    return new NextResponse(JSON.stringify(exported, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${questionSet.title.replace(/[^a-z0-9]/gi, '_')}.json"`,
      },
    })
  } catch (error) {
    console.error('Error exporting question set:', error)
    return NextResponse.json({ error: 'Failed to export question set' }, { status: 500 })
  }
}
