/**
 * 404 Not Found Page
 *
 * Shown when a user navigates to a non-existent route.
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="text-center">
        <h1 className="mb-2 text-9xl font-bold text-gray-200">404</h1>
        <h2 className="mb-4 text-2xl font-bold text-gray-800">Page Not Found</h2>
        <p className="mb-8 text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex gap-4 justify-center">
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
          <Link href="/games/quiz/join">
            <Button variant="outline">Join a Game</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
