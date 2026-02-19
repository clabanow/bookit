'use client'

/**
 * AI Question Set Generator
 *
 * Upload a photo of homework, vocab list, etc. and AI generates questions!
 *
 * Flow:
 * 1. Upload image or paste text
 * 2. Choose question type (multiple choice, spelling, or mixed)
 * 3. Optionally pick a content type (for text mode)
 * 4. AI extracts content and generates questions
 * 5. Review and edit questions — see detected content type
 * 6. Save as a new question set
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface GeneratedQuestion {
  type: 'MULTIPLE_CHOICE' | 'SPELLING'
  prompt: string
  options?: string[]
  correctIndex?: number
  answer?: string
  hint?: string
}

type ContentType = 'vocabulary' | 'math' | 'history' | 'science' | 'general'

type Step = 'input' | 'generating' | 'review' | 'saving'

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  vocabulary: 'Vocabulary',
  math: 'Math',
  history: 'History',
  science: 'Science',
  general: 'General',
}

export default function GenerateQuestionsPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('input')
  const [error, setError] = useState('')

  // Input state
  const [inputMode, setInputMode] = useState<'image' | 'text'>('image')
  const [imageData, setImageData] = useState<string | null>(null)
  const [imageType, setImageType] = useState<string>('')
  const [textInput, setTextInput] = useState('')
  const [questionType, setQuestionType] = useState<'MULTIPLE_CHOICE' | 'SPELLING' | 'MIXED'>('MULTIPLE_CHOICE')
  const [contentType, setContentType] = useState<ContentType>('general')

  // Usage tracking
  const [aiUsage, setAiUsage] = useState<{ used: number; limit: number; remaining: number; allowed: boolean } | null>(null)

  // Generated state
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [setTitle, setSetTitle] = useState('')
  const [detectedContentType, setDetectedContentType] = useState<ContentType | null>(null)

  // Fetch AI usage on mount
  useEffect(() => {
    fetch('/api/usage')
      .then((res) => res.json())
      .then((data) => {
        if (data.ai) setAiUsage(data.ai)
      })
      .catch(() => {
        // If usage fetch fails, don't block the page — just hide the counter
      })
  }, [])

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10MB')
      return
    }

    // Read as base64
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix to get just base64
      const base64 = result.split(',')[1]
      setImageData(base64)
      setImageType(file.type)
      setError('')
    }
    reader.onerror = () => {
      setError('Failed to read image')
    }
    reader.readAsDataURL(file)
  }

  async function handleGenerate() {
    setError('')
    setStep('generating')

    try {
      const body: Record<string, unknown> = {
        questionType,
        difficulty: 'medium',
      }

      if (inputMode === 'image' && imageData) {
        body.image = {
          data: imageData,
          mediaType: imageType,
        }
      } else if (inputMode === 'text' && textInput) {
        body.text = textInput
        body.contentType = contentType
      } else {
        throw new Error('Please provide an image or text')
      }

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      setQuestions(data.questions)

      // Update usage count from the response
      if (data.usage) setAiUsage(data.usage)

      // Capture detected content type from the API response
      if (data.extractedContent?.contentType) {
        setDetectedContentType(data.extractedContent.contentType as ContentType)
      }

      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setStep('input')
    }
  }

  /**
   * Re-generate questions with a different content type override.
   * Keeps the same input but sends the overridden content type.
   */
  async function handleRegenerate(overrideType: ContentType) {
    setDetectedContentType(overrideType)
    setError('')
    setStep('generating')

    try {
      const body: Record<string, unknown> = {
        questionType,
        difficulty: 'medium',
        contentType: overrideType,
      }

      if (inputMode === 'image' && imageData) {
        body.image = {
          data: imageData,
          mediaType: imageType,
        }
      } else if (inputMode === 'text' && textInput) {
        body.text = textInput
      }

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Re-generation failed')
      }

      setQuestions(data.questions)

      // Update usage count from the response
      if (data.usage) setAiUsage(data.usage)

      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-generation failed')
      setStep('review')
    }
  }

  async function handleSave() {
    if (!setTitle.trim()) {
      setError('Please enter a title for the question set')
      return
    }

    setStep('saving')
    setError('')

    try {
      // Format questions for the API
      const formattedQuestions = questions.map((q, index) => ({
        prompt: q.prompt,
        questionType: q.type,
        options: q.type === 'MULTIPLE_CHOICE' ? q.options : [],
        correctIndex: q.type === 'MULTIPLE_CHOICE' ? q.correctIndex : 0,
        answer: q.type === 'SPELLING' ? q.answer : null,
        hint: q.hint || null,
        order: index,
        timeLimitSec: q.type === 'SPELLING' ? 30 : 20,
      }))

      const res = await fetch('/api/question-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: setTitle,
          questions: formattedQuestions,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save')
      }

      // Success! Redirect to the sets page
      router.push('/games/quiz/host/sets')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setStep('review')
    }
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  // Input Step
  if (step === 'input') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Question Generator</h1>
              <p className="text-gray-500">Upload homework or enter text to generate questions</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/games/quiz/host/sets')}>
              Cancel
            </Button>
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 border border-red-200 p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Input mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={inputMode === 'image' ? 'default' : 'outline'}
              onClick={() => setInputMode('image')}
            >
              Upload Image
            </Button>
            <Button
              variant={inputMode === 'text' ? 'default' : 'outline'}
              onClick={() => setInputMode('text')}
            >
              Enter Text
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {inputMode === 'image' ? 'Upload Photo' : 'Enter Content'}
              </CardTitle>
              <CardDescription>
                {inputMode === 'image'
                  ? 'Take a photo of homework, vocab list, or textbook page'
                  : 'Paste or type vocabulary words, facts, or content'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {inputMode === 'image' ? (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      imageData
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-blue-400 bg-gray-50'
                    }`}
                  >
                    {imageData ? (
                      <div className="text-center">
                        <span className="text-4xl">✓</span>
                        <p className="text-green-600 mt-2">Image uploaded</p>
                        <p className="text-xs text-gray-500">Click to change</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <span className="text-4xl">📷</span>
                        <p className="text-gray-500 mt-2">Click to upload image</p>
                        <p className="text-xs text-gray-400">or drag and drop</p>
                      </div>
                    )}
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="text-content">Content</Label>
                    <textarea
                      id="text-content"
                      className="w-full h-48 p-3 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Enter vocabulary words (one per line), facts, definitions, etc."
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                    />
                  </div>

                  {/* Content type selector — only shown for text input */}
                  <div>
                    <Label htmlFor="content-type">Content Type</Label>
                    <select
                      id="content-type"
                      value={contentType}
                      onChange={(e) => setContentType(e.target.value as ContentType)}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Helps AI generate better questions for this content
                    </p>
                  </div>
                </div>
              )}

              <div>
                <Label>Question Type</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {(['MULTIPLE_CHOICE', 'SPELLING', 'MIXED'] as const).map((type) => (
                    <Button
                      key={type}
                      size="sm"
                      variant={questionType === type ? 'default' : 'outline'}
                      onClick={() => setQuestionType(type)}
                    >
                      {type === 'MULTIPLE_CHOICE' && '4 Options'}
                      {type === 'SPELLING' && 'Spelling'}
                      {type === 'MIXED' && 'Mixed'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* AI usage limit display */}
              {aiUsage && aiUsage.limit > 0 && (
                <div className={`text-sm text-center p-2 rounded-md ${
                  aiUsage.remaining === 0
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-100'
                }`}>
                  {aiUsage.remaining === 0
                    ? `You've used all ${aiUsage.limit} AI generations for today. Come back tomorrow!`
                    : `${aiUsage.remaining} of ${aiUsage.limit} generations remaining today`}
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleGenerate}
                disabled={
                  (inputMode === 'image' ? !imageData : !textInput.trim()) ||
                  (aiUsage !== null && aiUsage.limit > 0 && !aiUsage.allowed)
                }
              >
                Generate Questions with AI
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Generating Step
  if (step === 'generating') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="text-6xl mb-4 animate-bounce">🤖</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Generating Questions...</h2>
            <p className="text-gray-500">AI is analyzing your content</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Review Step
  if (step === 'review') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review Questions</h1>
              <p className="text-gray-500">{questions.length} questions generated</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setStep('input')}>
              Start Over
            </Button>
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 border border-red-200 p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Detected content type + override */}
          {detectedContentType && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Content Type:</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                      {CONTENT_TYPE_LABELS[detectedContentType]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={detectedContentType}
                      onChange={(e) => handleRegenerate(e.target.value as ContentType)}
                      className="text-sm px-2 py-1 rounded bg-white border border-gray-300 text-gray-900"
                    >
                      {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-500">Override &amp; re-generate</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Title input */}
          <Card>
            <CardContent className="pt-4">
              <Label htmlFor="set-title">Question Set Title</Label>
              <Input
                id="set-title"
                placeholder="e.g., Week 3 Spelling Words"
                value={setTitle}
                onChange={(e) => setSetTitle(e.target.value)}
                className="mt-2"
              />
            </CardContent>
          </Card>

          {/* Questions list */}
          <div className="space-y-4">
            {questions.map((q, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                      {q.type === 'MULTIPLE_CHOICE' ? '4 Options' : 'Spelling'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => removeQuestion(index)}
                    >
                      Remove
                    </Button>
                  </div>

                  <p className="text-gray-900 font-medium mb-2">
                    {index + 1}. {q.prompt}
                  </p>

                  {q.type === 'MULTIPLE_CHOICE' && q.options && (
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`p-2 rounded text-sm ${
                            i === q.correctIndex
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-gray-50 text-gray-600 border border-gray-200'
                          }`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'SPELLING' && (
                    <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                      <p className="text-sm text-gray-600">
                        Answer: <span className="text-green-600 font-medium">{q.answer}</span>
                      </p>
                      {q.hint && (
                        <p className="text-xs text-gray-500 mt-1">Hint: {q.hint}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {questions.length > 0 && (
            <Button className="w-full" size="lg" onClick={handleSave}>
              Save Question Set
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Saving Step
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="text-6xl mb-4">💾</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Saving...</h2>
          <p className="text-gray-500">Creating your question set</p>
        </CardContent>
      </Card>
    </div>
  )
}
