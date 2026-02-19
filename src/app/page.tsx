import { Button } from '@/components/ui/button';
import { GameBrowser } from '@/components/GameBrowser';
import { getEnabledGames } from '@/lib/games';
import { getSession } from '@/lib/auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getSession();

  // Not logged in — show welcome + login/register
  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4 md:p-8">
        <main className="flex flex-col items-center text-center">
          <h1 className="mb-4 text-4xl sm:text-5xl md:text-6xl font-bold text-blue-600">
            Mack &amp; Lex Games
          </h1>
          <p className="mb-8 md:mb-12 max-w-md text-lg md:text-xl text-gray-600 px-4">
            A multi-game platform for fun and learning.
          </p>

          <div className="flex gap-4">
            <Link href="/login">
              <Button size="lg">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline">Register</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Logged in — fetch games on the server and hand off to the client component.
  // GameBrowser handles player fetching, selection, and creation client-side
  // because it needs interactivity (useState, localStorage, form submission).
  const games = getEnabledGames();

  return (
    <GameBrowser
      games={games.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        icon: g.icon,
        basePath: g.basePath,
        accentColor: g.accentColor,
      }))}
    />
  );
}
