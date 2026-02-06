/**
 * Question Set Selector Component
 *
 * Allows the host to select a question set before starting a game.
 * Fetches available sets from the API and displays them in a list.
 *
 * This component handles the entire selection flow:
 * 1. Loads question sets on mount
 * 2. Displays them for selection
 * 3. Calls onSelect callback when one is chosen
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface QuestionSet {
  id: string
  title: string
  questionCount: number
}

interface SetSelectorProps {
  /** Called when a set is selected, with the set ID and title */
  onSelect: (setId: string, setTitle: string) => void
  /** Optional: ID of currently selected set */
  selectedId?: string
}

export function SetSelector({ onSelect, selectedId }: SetSelectorProps) {
  const [sets, setSets] = useState<QuestionSet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch question sets when component mounts
  useEffect(() => {
    async function fetchSets() {
      try {
        const response = await fetch('/api/question-sets')
        if (!response.ok) {
          throw new Error('Failed to load question sets')
        }
        const data = await response.json()
        // Transform to match our interface
        // API returns questionCount directly or _count.questions
        const transformed = data.map(
          (set: { id: string; title: string; questionCount?: number; _count?: { questions: number } }) => ({
            id: set.id,
            title: set.title,
            questionCount: set.questionCount ?? set._count?.questions ?? 0,
          })
        )
        setSets(transformed)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sets')
      } finally {
        setLoading(false)
      }
    }

    fetchSets()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Loading question sets...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-red-500">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (sets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select a Question Set</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-500">
            You don&apos;t have any question sets yet. Create one first!
          </p>
          <Link href="/games/quiz/host/sets/new">
            <Button className="w-full">Create Question Set</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Select a Question Set</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sets.map((set) => (
          <button
            key={set.id}
            onClick={() => onSelect(set.id, set.title)}
            className={`w-full rounded-lg border p-4 text-left transition-colors ${
              selectedId === set.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            <div className="font-medium text-gray-900">{set.title}</div>
            <div className="text-sm text-gray-500">
              {set.questionCount} question{set.questionCount !== 1 ? 's' : ''}
            </div>
          </button>
        ))}

        <div className="pt-2">
          <Link href="/games/quiz/host/sets" className="text-sm text-blue-600 hover:underline">
            Manage question sets
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
