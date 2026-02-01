'use client'

/**
 * AI Question Set Generator
 *
 * Upload a photo of homework, vocab list, etc. and AI generates questions!
 *
 * Flow:
 * 1. Upload image or paste text
 * 2. Choose question type (multiple choice, spelling, or mixed)
 * 3. AI extracts content and generates questions
 * 4. Review and edit questions
 * 5. Save as a new question set
 */

import { useState } from 'react'
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

type Step = 'input' | 'generating' | 'review' | 'saving'

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

  // Generated state
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [setTitle, setSetTitle] = useState('')

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
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setStep('input')
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
      router.push('/host/sets')
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
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">AI Question Generator</h1>
              <p className="text-slate-400">Upload homework or enter text to generate questions</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/host/sets')}>
              Cancel
            </Button>
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-md">
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
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
                    }`}
                  >
                    {imageData ? (
                      <div className="text-center">
                        <span className="text-4xl">✓</span>
                        <p className="text-green-400 mt-2">Image uploaded</p>
                        <p className="text-xs text-slate-400">Click to change</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <span className="text-4xl">📷</span>
                        <p className="text-slate-400 mt-2">Click to upload image</p>
                        <p className="text-xs text-slate-500">or drag and drop</p>
                      </div>
                    )}
                  </label>
                </div>
              ) : (
                <div>
                  <Label htmlFor="text-content">Content</Label>
                  <textarea
                    id="text-content"
                    className="w-full h-48 p-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    placeholder="Enter vocabulary words (one per line), facts, definitions, etc."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                  />
                </div>
              )}

              <div>
                <Label>Question Type</Label>
                <div className="flex gap-2 mt-2">
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

              <Button
                className="w-full"
                size="lg"
                onClick={handleGenerate}
                disabled={inputMode === 'image' ? !imageData : !textInput.trim()}
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
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="text-6xl mb-4 animate-bounce">🤖</div>
            <h2 className="text-xl font-bold text-white mb-2">Generating Questions...</h2>
            <p className="text-slate-400">AI is analyzing your content</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Review Step
  if (step === 'review') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Review Questions</h1>
              <p className="text-slate-400">{questions.length} questions generated</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setStep('input')}>
              Start Over
            </Button>
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-md">
              {error}
            </div>
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
                    <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
                      {q.type === 'MULTIPLE_CHOICE' ? '4 Options' : 'Spelling'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => removeQuestion(index)}
                    >
                      Remove
                    </Button>
                  </div>

                  <p className="text-white font-medium mb-2">
                    {index + 1}. {q.prompt}
                  </p>

                  {q.type === 'MULTIPLE_CHOICE' && q.options && (
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`p-2 rounded text-sm ${
                            i === q.correctIndex
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'SPELLING' && (
                    <div className="p-2 bg-slate-800 rounded">
                      <p className="text-sm text-slate-400">
                        Answer: <span className="text-green-400">{q.answer}</span>
                      </p>
                      {q.hint && (
                        <p className="text-xs text-slate-500 mt-1">Hint: {q.hint}</p>
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="text-6xl mb-4">💾</div>
          <h2 className="text-xl font-bold text-white mb-2">Saving...</h2>
          <p className="text-slate-400">Creating your question set</p>
        </CardContent>
      </Card>
    </div>
  )
}
