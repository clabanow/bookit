import { Button } from '@/components/ui/button';
import { SocketStatus } from '@/components/SocketStatus';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4 md:p-8">
      {/* Auth links in top-right */}
      <nav className="absolute top-4 right-4 flex gap-3 md:gap-4">
        <Link href="/chat" className="text-sm text-gray-600 hover:text-blue-600">
          Chat
        </Link>
        <Link href="/login" className="text-sm text-gray-600 hover:text-blue-600">
          Sign In
        </Link>
        <Link href="/register" className="text-sm text-gray-600 hover:text-blue-600">
          Register
        </Link>
      </nav>

      <main className="flex flex-col items-center text-center">
        <h1 className="mb-4 text-4xl sm:text-5xl md:text-6xl font-bold text-blue-600">Bookit</h1>
        <p className="mb-8 md:mb-12 max-w-md text-lg md:text-xl text-gray-600 px-4">
          Live classroom quiz games that make learning fun and engaging.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href="/host">
            <Button size="lg" className="w-48">
              Host a Game
            </Button>
          </Link>
          <Link href="/join">
            <Button size="lg" variant="outline" className="w-48">
              Join a Game
            </Button>
          </Link>
        </div>
      </main>
      {/* Socket status indicator - shows connection state in bottom-right corner */}
      <SocketStatus />
    </div>
  );
}
