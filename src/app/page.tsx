import { Button } from '@/components/ui/button';
import { SocketStatus } from '@/components/SocketStatus';
import { getEnabledGames } from '@/lib/games';
import Link from 'next/link';

export default function Home() {
  const games = getEnabledGames();

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
        <h1 className="mb-4 text-4xl sm:text-5xl md:text-6xl font-bold text-blue-600">
          Mack &amp; Lex Games
        </h1>
        <p className="mb-8 md:mb-12 max-w-md text-lg md:text-xl text-gray-600 px-4">
          A multi-game platform for fun and learning.
        </p>

        {/* Game cards */}
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full max-w-4xl px-4">
          {games.map((game) => (
            <div
              key={game.id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-4xl mb-3">{game.icon}</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{game.name}</h2>
              <p className="text-sm text-gray-500 mb-4">{game.description}</p>
              <div className="flex justify-center gap-3">
                <Link href={`${game.basePath}/host`}>
                  <Button size="sm">Host</Button>
                </Link>
                <Link href={`${game.basePath}/join`}>
                  <Button size="sm" variant="outline">Join</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
      {/* Socket status indicator - shows connection state in bottom-right corner */}
      <SocketStatus />
    </div>
  );
}
