/**
 * Edit Question Set Page
 *
 * This page loads an existing question set and displays the editor.
 * It's a server component that fetches data, then renders a client component.
 *
 * Dynamic Route: The [id] in the folder name means this page receives
 * the question set ID as a route parameter. So /host/sets/abc123/edit
 * would have params.id = "abc123"
 */

// Force dynamic rendering - don't pre-render at build time
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { QuestionSetEditor } from '@/components/host/QuestionSetEditor'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Fetch the question set with all its questions
 */
async function getQuestionSet(id: string) {
  const set = await prisma.questionSet.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!set) return null

  // Transform to the shape the editor expects.
  // For spelling questions, options may be empty so we fallback to placeholder values
  // since the QuestionData type expects a 4-tuple (the editor won't display them).
  return {
    id: set.id,
    title: set.title,
    questions: set.questions.map((q) => ({
      id: q.id,
      questionType: (q.questionType as 'MULTIPLE_CHOICE' | 'SPELLING') ?? 'MULTIPLE_CHOICE',
      prompt: q.prompt,
      options: (q.options && (q.options as string[]).length === 4
        ? q.options
        : ['', '', '', '']) as [string, string, string, string],
      correctIndex: q.correctIndex,
      answer: (q.answer as string) ?? '',
      hint: (q.hint as string) ?? '',
      timeLimitSec: q.timeLimitSec,
    })),
  }
}

export default async function EditQuestionSetPage({ params }: PageProps) {
  const { id } = await params
  const questionSet = await getQuestionSet(id)

  // notFound() shows Next.js's 404 page
  if (!questionSet) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit Question Set</h1>
          <p className="mt-1 text-gray-500">Update your quiz questions</p>
        </div>

        {/* Back link */}
        <div className="mb-6">
          <Link href="/games/quiz/host/sets" className="text-sm text-blue-600 hover:underline">
            &larr; Back to Question Sets
          </Link>
        </div>

        {/* Editor */}
        <QuestionSetEditor initialData={questionSet} />
      </div>
    </div>
  )
}
