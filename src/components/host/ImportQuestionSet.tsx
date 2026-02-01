/**
 * Import Question Set Component
 *
 * Handles file upload for importing question sets from JSON.
 */

'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function ImportQuestionSet() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const router = useRouter()

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.endsWith('.json')) {
      alert('Please select a JSON file')
      return
    }

    setIsImporting(true)

    try {
      // Read file contents
      const text = await file.text()
      const data = JSON.parse(text)

      // Send to import API
      const response = await fetch('/api/question-sets/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Import failed')
      }

      const imported = await response.json()

      // Refresh the page to show the new set
      router.refresh()

      alert(`Successfully imported "${imported.title}"`)
    } catch (error) {
      console.error('Import error:', error)
      if (error instanceof SyntaxError) {
        alert('Invalid JSON file format')
      } else if (error instanceof Error) {
        alert(`Import failed: ${error.message}`)
      } else {
        alert('Failed to import question set')
      }
    } finally {
      setIsImporting(false)
      // Reset file input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button variant="outline" onClick={handleClick} disabled={isImporting}>
        {isImporting ? 'Importing...' : 'Import'}
      </Button>
    </>
  )
}
