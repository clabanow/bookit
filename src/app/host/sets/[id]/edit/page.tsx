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

  // Transform to the shape the editor expects
  return {
    id: set.id,
    title: set.title,
    questions: set.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options as [string, string, string, string],
      correctIndex: q.correctIndex,
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Question Set</h1>
          <p className="mt-1 text-gray-500">Update your quiz questions</p>
        </div>

        {/* Back link */}
        <div className="mb-6">
          <Link href="/host/sets" className="text-sm text-blue-600 hover:underline">
            &larr; Back to Question Sets
          </Link>
        </div>

        {/* Editor */}
        <QuestionSetEditor initialData={questionSet} />
      </div>
    </div>
  )
}
