/**
 * Question Sets Page
 *
 * Lists all question sets for the host to manage.
 * This is a server component that fetches data on the server.
 */

// Force dynamic rendering - don't pre-render at build time
// This is needed because we access the database, which isn't available during build
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { QuestionSetList } from '@/components/host/QuestionSetList'
import { ImportQuestionSet } from '@/components/host/ImportQuestionSet'
import { prisma } from '@/lib/db'

// Fetch question sets on the server
async function getQuestionSets() {
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

  return sets.map((set) => ({
    id: set.id,
    title: set.title,
    questionCount: set._count.questions,
    updatedAt: set.updatedAt.toISOString(),
  }))
}

export default async function QuestionSetsPage() {
  const sets = await getQuestionSets()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Question Sets</h1>
            <p className="mt-1 text-gray-500">Create and manage your quiz questions</p>
          </div>
          <div className="flex gap-2">
            <ImportQuestionSet />
            <Link href="/host/sets/new">
              <Button>New Question Set</Button>
            </Link>
          </div>
        </div>

        {/* Back link */}
        <div className="mb-6">
          <Link href="/host" className="text-sm text-blue-600 hover:underline">
            &larr; Back to Host Dashboard
          </Link>
        </div>

        {/* Question Set List */}
        <QuestionSetList sets={sets} />
      </div>
    </div>
  )
}
