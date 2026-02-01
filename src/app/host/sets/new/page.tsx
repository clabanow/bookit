/**
 * New Question Set Page
 *
 * Displays the editor component without initial data,
 * allowing the host to create a new question set.
 */

import Link from 'next/link'
import { QuestionSetEditor } from '@/components/host/QuestionSetEditor'

export default function NewQuestionSetPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Question Set</h1>
          <p className="mt-1 text-gray-500">Build a new quiz for your players</p>
        </div>

        {/* Back link */}
        <div className="mb-6">
          <Link href="/host/sets" className="text-sm text-blue-600 hover:underline">
            &larr; Back to Question Sets
          </Link>
        </div>

        {/* Editor without initial data = create mode */}
        <QuestionSetEditor />
      </div>
    </div>
  )
}
