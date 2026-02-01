import { Button } from '@/components/ui/button';
import { SocketStatus } from '@/components/SocketStatus';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-8">
      <main className="flex flex-col items-center text-center">
        <h1 className="mb-4 text-6xl font-bold text-blue-600">Bookit</h1>
        <p className="mb-12 max-w-md text-xl text-gray-600">
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
