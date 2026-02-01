/**
 * Global Error Boundary
 *
 * This is a special Next.js file that catches errors in the app.
 * It shows a friendly error message instead of a blank page.
 *
 * Key features:
 * - Catches JavaScript errors during rendering
 * - Logs errors to console for debugging
 * - Provides a "Try Again" button to retry
 */

'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error for debugging
    console.error('Application error:', error)
  }, [error])

  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center bg-red-50 p-8"
    >
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-red-600">Something went wrong</h1>
        <p className="mb-6 text-gray-600">
          An unexpected error occurred. Please try again.
        </p>

        {/* Show error details in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 max-w-lg rounded-lg bg-red-100 p-4 text-left">
            <p className="font-mono text-sm text-red-800">{error.message}</p>
            {error.digest && (
              <p className="mt-2 text-xs text-red-600">Error ID: {error.digest}</p>
            )}
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <Button onClick={reset} variant="outline">
            Try Again
          </Button>
          <Button onClick={() => (window.location.href = '/')}>
            Go Home
          </Button>
        </div>
      </div>
    </div>
  )
}
