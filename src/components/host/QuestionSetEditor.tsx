/**
 * Question Set Editor Component
 *
 * A form for creating or editing a question set.
 * Supports two question types:
 * - Multiple Choice: prompt, 4 options, correct answer, time limit
 * - Spelling: prompt (clue/definition), answer (word to spell), optional hint
 *
 * This is a "client component" because it uses React state and event handlers.
 * In Next.js App Router, components that use useState, onClick, etc. must be
 * marked with 'use client' at the top.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { speakWord, isSpeechSupported } from '@/lib/audio/textToSpeech'

/**
 * Shape of a single question in the editor.
 * questionType determines which fields are relevant:
 * - MULTIPLE_CHOICE uses options + correctIndex
 * - SPELLING uses answer + hint
 */
interface QuestionData {
  id?: string // Only present for existing questions
  questionType: 'MULTIPLE_CHOICE' | 'SPELLING'
  prompt: string
  options: [string, string, string, string]
  correctIndex: number
  answer: string
  hint: string
  timeLimitSec: number
}

/**
 * Props for the editor component
 */
interface QuestionSetEditorProps {
  // Initial data (undefined for new sets)
  initialData?: {
    id: string
    title: string
    questions: QuestionData[]
  }
}

/**
 * Creates a blank question with default values.
 * Spelling questions default to 30s because typing takes longer than clicking.
 */
function createEmptyQuestion(type: 'MULTIPLE_CHOICE' | 'SPELLING' = 'MULTIPLE_CHOICE'): QuestionData {
  return {
    questionType: type,
    prompt: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    answer: '',
    hint: '',
    timeLimitSec: type === 'SPELLING' ? 30 : 20,
  }
}

export function QuestionSetEditor({ initialData }: QuestionSetEditorProps) {
  const router = useRouter()
  const isEditing = !!initialData

  // Form state
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [questions, setQuestions] = useState<QuestionData[]>(
    initialData?.questions ?? [createEmptyQuestion()]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Update a specific question in the array
   * We create a new array to trigger React re-render
   */
  const updateQuestion = (index: number, updates: Partial<QuestionData>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...updates } : q))
    )
  }

  /**
   * Update a specific option within a question
   */
  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q
        const newOptions = [...q.options] as [string, string, string, string]
        newOptions[optionIndex] = value
        return { ...q, options: newOptions }
      })
    )
  }

  /**
   * Add a new blank question at the end
   */
  const addQuestion = (type: 'MULTIPLE_CHOICE' | 'SPELLING' = 'MULTIPLE_CHOICE') => {
    setQuestions((prev) => [...prev, createEmptyQuestion(type)])
  }

  /**
   * Remove a question by index
   * Don't allow removing the last question
   */
  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  /**
   * Validate the form before saving.
   * MC questions require all 4 options filled in.
   * Spelling questions require an answer word.
   */
  const validate = (): string | null => {
    if (!title.trim()) {
      return 'Please enter a title for your question set'
    }
    if (questions.length === 0) {
      return 'Add at least one question'
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.prompt.trim()) {
        return `Question ${i + 1}: Please enter the question text`
      }
      if (q.questionType === 'MULTIPLE_CHOICE') {
        for (let j = 0; j < 4; j++) {
          if (!q.options[j].trim()) {
            return `Question ${i + 1}: Please fill in all 4 options`
          }
        }
      } else {
        // SPELLING
        if (!q.answer.trim()) {
          return `Question ${i + 1}: Please enter the answer word`
        }
      }
    }
    return null
  }

  /**
   * Save the question set to the API.
   * Includes questionType, answer, and hint for spelling support.
   */
  const handleSave = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const payload = {
        title: title.trim(),
        questions: questions.map((q) => ({
          questionType: q.questionType,
          prompt: q.prompt.trim(),
          options: q.questionType === 'MULTIPLE_CHOICE' ? q.options.map((o) => o.trim()) : [],
          correctIndex: q.questionType === 'MULTIPLE_CHOICE' ? q.correctIndex : 0,
          answer: q.questionType === 'SPELLING' ? q.answer.trim() : null,
          hint: q.questionType === 'SPELLING' && q.hint.trim() ? q.hint.trim() : null,
          timeLimitSec: q.timeLimitSec,
        })),
      }

      const url = isEditing
        ? `/api/question-sets/${initialData.id}`
        : '/api/question-sets'

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      // Navigate back to the list
      router.push('/games/quiz/host/sets')
      router.refresh() // Refresh to show updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Preview pronunciation using Web Speech API
   */
  const handlePreview = async (word: string) => {
    if (!word.trim()) return
    try {
      await speakWord(word.trim())
    } catch {
      // Speech not supported or failed — not critical
    }
  }

  return (
    <div className="space-y-6">
      {/* Title input */}
      <div className="space-y-2">
        <Label htmlFor="title">Question Set Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., World Geography Quiz"
          className="w-full md:max-w-md"
        />
      </div>

      {/* Questions list */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Questions</h2>

        {questions.map((question, qIndex) => (
          <Card key={qIndex}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Question {qIndex + 1}</CardTitle>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      question.questionType === 'SPELLING'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {question.questionType === 'SPELLING' ? 'Spelling' : 'Multiple Choice'}
                  </span>
                </div>
                {questions.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeQuestion(qIndex)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Question prompt */}
              <div className="space-y-2">
                <Label htmlFor={`prompt-${qIndex}`}>
                  {question.questionType === 'SPELLING' ? 'Clue / Definition' : 'Question'}
                </Label>
                <Input
                  id={`prompt-${qIndex}`}
                  value={question.prompt}
                  onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
                  placeholder={
                    question.questionType === 'SPELLING'
                      ? 'A large animal with a trunk'
                      : 'What is the capital of France?'
                  }
                />
              </div>

              {/* Conditional: MC options or Spelling answer */}
              {question.questionType === 'MULTIPLE_CHOICE' ? (
                /* Multiple Choice: Options with radio buttons */
                <div className="space-y-2">
                  <Label>Answer Options</Label>
                  <div className="grid gap-2">
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={question.correctIndex === oIndex}
                          onChange={() => updateQuestion(qIndex, { correctIndex: oIndex })}
                          className="h-4 w-4"
                        />
                        <Input
                          value={option}
                          onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                          placeholder={`Option ${oIndex + 1}`}
                          className="flex-1"
                        />
                        {question.correctIndex === oIndex && (
                          <span className="text-xs text-green-600 font-medium">
                            Correct
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Select the radio button next to the correct answer
                  </p>
                </div>
              ) : (
                /* Spelling: Answer word + optional hint + pronunciation preview */
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={`answer-${qIndex}`}>Answer (word to spell)</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`answer-${qIndex}`}
                        value={question.answer}
                        onChange={(e) => updateQuestion(qIndex, { answer: e.target.value })}
                        placeholder="elephant"
                        className="flex-1"
                      />
                      {isSpeechSupported() && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(question.answer)}
                          disabled={!question.answer.trim()}
                          title="Preview pronunciation"
                        >
                          Preview
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`hint-${qIndex}`}>Hint (optional)</Label>
                    <Input
                      id={`hint-${qIndex}`}
                      value={question.hint}
                      onChange={(e) => updateQuestion(qIndex, { hint: e.target.value })}
                      placeholder="Starts with 'E', 8 letters"
                    />
                  </div>
                </div>
              )}

              {/* Time limit */}
              <div className="space-y-2">
                <Label htmlFor={`time-${qIndex}`}>Time Limit (seconds)</Label>
                <Input
                  id={`time-${qIndex}`}
                  type="number"
                  min={5}
                  max={120}
                  value={question.timeLimitSec}
                  onChange={(e) =>
                    updateQuestion(qIndex, { timeLimitSec: parseInt(e.target.value) || 20 })
                  }
                  className="w-24"
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Two buttons: one for each question type */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => addQuestion('MULTIPLE_CHOICE')}>
            + Multiple Choice
          </Button>
          <Button variant="outline" onClick={() => addQuestion('SPELLING')}>
            + Spelling
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Question Set'}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/games/quiz/host/sets')}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
