/**
 * Question Set List Component
 *
 * Displays a list of question sets with their question count.
 * Each set can be clicked to edit or selected for a game.
 */

'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface QuestionSet {
  id: string
  title: string
  questionCount: number
  updatedAt: string
}

interface QuestionSetListProps {
  sets: QuestionSet[]
  onSelect?: (setId: string) => void
  selectable?: boolean
}

/**
 * Handle exporting a question set as JSON file.
 */
async function handleExport(setId: string, title: string) {
  try {
    const response = await fetch(`/api/question-sets/${setId}/export`)
    if (!response.ok) {
      throw new Error('Export failed')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Export error:', error)
    alert('Failed to export question set')
  }
}

export function QuestionSetList({ sets, onSelect, selectable = false }: QuestionSetListProps) {
  if (sets.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <h3 className="mb-2 text-lg font-medium text-gray-900">No question sets yet</h3>
        <p className="mb-4 text-gray-500">Create your first quiz to get started</p>
        <Link href="/host/sets/new">
          <Button>Create Question Set</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sets.map((set) => (
        <div
          key={set.id}
          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
            selectable ? 'cursor-pointer' : ''
          }`}
          onClick={selectable ? () => onSelect?.(set.id) : undefined}
        >
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{set.title}</h3>
            <p className="text-sm text-gray-500">
              {set.questionCount} question{set.questionCount !== 1 ? 's' : ''} &middot; Updated{' '}
              {formatRelativeTime(set.updatedAt)}
            </p>
          </div>

          {!selectable && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleExport(set.id, set.title)
                }}
              >
                Export
              </Button>
              <Link href={`/host/sets/${set.id}/edit`}>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </Link>
            </div>
          )}

          {selectable && (
            <Button size="sm" onClick={() => onSelect?.(set.id)}>
              Select
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Format a date string as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`

  return date.toLocaleDateString()
}
