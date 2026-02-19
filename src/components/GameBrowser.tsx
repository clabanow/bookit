'use client'

/**
 * GameBrowser — the logged-in home page experience.
 *
 * This component guides users through the player-first flow:
 *   1. Loading: fetching the user's players from /api/players
 *   2. No players: show a "Create Your First Player" form inline
 *   3. Has players: show a player bar (active player + switch/new) above game cards
 *
 * The active player is persisted in localStorage so it survives page refreshes.
 * This is a "client component" because it needs useState/useEffect for interactivity.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Matches the shape returned by GET /api/players */
interface Player {
  id: string
  nickname: string
  avatar: string | null
  coins: number
  createdAt: string
}

/** Serializable game config passed from the server component */
interface GameConfig {
  id: string
  name: string
  description: string
  icon: string
  basePath: string
  accentColor: string
}

const ACTIVE_PLAYER_KEY = 'mack_active_player'

export function GameBrowser({ games }: { games: GameConfig[] }) {
  const router = useRouter()

  // Player data state
  const [players, setPlayers] = useState<Player[]>([])
  const [canCreateMore, setCanCreateMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Active player selection
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null)
  const [showPlayerPicker, setShowPlayerPicker] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Create form state
  const [nickname, setNickname] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [creating, setCreating] = useState(false)

  // --- Data fetching ---

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch('/api/players')

      if (res.status === 401) {
        router.push('/login')
        return
      }

      if (!res.ok) throw new Error('Failed to fetch players')

      const data = await res.json()
      setPlayers(data.players)
      setCanCreateMore(data.canCreateMore)

      // Restore active player from localStorage, or auto-select the first one
      const stored = localStorage.getItem(ACTIVE_PLAYER_KEY)
      const playerIds = (data.players as Player[]).map((p) => p.id)

      if (stored && playerIds.includes(stored)) {
        setActivePlayerId(stored)
      } else if (data.players.length > 0) {
        const firstId = data.players[0].id
        setActivePlayerId(firstId)
        localStorage.setItem(ACTIVE_PLAYER_KEY, firstId)
      }
    } catch {
      setError('Failed to load players')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  // --- Player selection ---

  function selectPlayer(playerId: string) {
    setActivePlayerId(playerId)
    localStorage.setItem(ACTIVE_PLAYER_KEY, playerId)
    setShowPlayerPicker(false)
  }

  // --- Player creation ---

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (pin.length !== 4) {
      setError('PIN must be exactly 4 digits')
      return
    }
    if (pin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    setCreating(true)

    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, pin }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create player')
        return
      }

      // Auto-select the new player
      const newPlayerId = data.player.id
      setActivePlayerId(newPlayerId)
      localStorage.setItem(ACTIVE_PLAYER_KEY, newPlayerId)

      // Reset form
      setNickname('')
      setPin('')
      setConfirmPin('')
      setShowCreateForm(false)

      // Refresh player list
      await fetchPlayers()
    } catch {
      setError('Network error')
    } finally {
      setCreating(false)
    }
  }

  function resetForm() {
    setNickname('')
    setPin('')
    setConfirmPin('')
    setError('')
    setShowCreateForm(false)
  }

  // --- Derived state ---

  const activePlayer = players.find((p) => p.id === activePlayerId) ?? null
  const isFirstTimeUser = !loading && players.length === 0

  // --- Render ---

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  // No players yet — show the "Create Your First Player" prompt
  if (isFirstTimeUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4 md:p-8">
        <Nav />

        <main className="flex flex-col items-center text-center w-full max-w-md">
          <h1 className="mb-2 text-4xl sm:text-5xl font-bold text-blue-600">
            Welcome!
          </h1>
          <p className="mb-8 text-lg text-gray-600">
            Create your first player to start playing games.
          </p>

          <CreatePlayerForm
            nickname={nickname}
            setNickname={setNickname}
            pin={pin}
            setPin={setPin}
            confirmPin={confirmPin}
            setConfirmPin={setConfirmPin}
            creating={creating}
            onSubmit={handleCreate}
          />

          {error && <ErrorBanner message={error} />}
        </main>
      </div>
    )
  }

  // Has players — show player bar + game cards
  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-blue-50 to-white p-4 md:p-8">
      <Nav />

      <main className="flex flex-col items-center text-center w-full mt-12">
        <h1 className="mb-4 text-4xl sm:text-5xl md:text-6xl font-bold text-blue-600">
          Mack &amp; Lex Games
        </h1>

        {/* Player bar — shows who's playing and lets you switch */}
        <div className="mb-8 w-full max-w-md">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            {activePlayer ? (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-bold text-white">
                  {activePlayer.nickname.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">
                    Playing as {activePlayer.nickname}
                  </p>
                  <p className="text-xs text-yellow-600">{activePlayer.coins} coins</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a player</p>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setShowPlayerPicker(!showPlayerPicker)
                  setShowCreateForm(false)
                }}
              >
                Switch
              </Button>
              {canCreateMore && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setShowCreateForm(!showCreateForm)
                    setShowPlayerPicker(false)
                    setError('')
                  }}
                >
                  + New
                </Button>
              )}
            </div>
          </div>

          {/* Player picker dropdown */}
          {showPlayerPicker && (
            <div className="mt-2 rounded-lg border border-gray-200 bg-white p-2 shadow-md">
              {players.map((player) => (
                <button
                  key={player.id}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-blue-50 ${
                    player.id === activePlayerId ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => selectPlayer(player.id)}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-bold text-white">
                    {player.nickname.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{player.nickname}</p>
                    <p className="text-xs text-yellow-600">{player.coins} coins</p>
                  </div>
                  {player.id === activePlayerId && (
                    <span className="ml-auto text-xs text-blue-600">Active</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Inline create form (shown when "+ New" is clicked) */}
          {showCreateForm && (
            <div className="mt-2 rounded-lg border border-gray-200 bg-white p-4 shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">New Player</h3>
                <Button variant="ghost" size="sm" className="text-xs" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
              <CreatePlayerForm
                nickname={nickname}
                setNickname={setNickname}
                pin={pin}
                setPin={setPin}
                confirmPin={confirmPin}
                setConfirmPin={setConfirmPin}
                creating={creating}
                onSubmit={handleCreate}
              />
            </div>
          )}

          {error && <ErrorBanner message={error} />}
        </div>

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
    </div>
  )
}

// --- Sub-components ---

/** Top-right navigation links (same for all logged-in states) */
function Nav() {
  return (
    <nav className="absolute top-4 right-4 flex gap-3 md:gap-4">
      <Link href="/account/players" className="text-sm text-gray-600 hover:text-blue-600">
        My Players
      </Link>
      <Link href="/chat" className="text-sm text-gray-600 hover:text-blue-600">
        Chat
      </Link>
      <Link href="/api/auth/logout" className="text-sm text-gray-600 hover:text-blue-600">
        Sign Out
      </Link>
    </nav>
  )
}

/** Reusable create player form (used for first-time and inline new) */
function CreatePlayerForm({
  nickname,
  setNickname,
  pin,
  setPin,
  confirmPin,
  setConfirmPin,
  creating,
  onSubmit,
}: {
  nickname: string
  setNickname: (v: string) => void
  pin: string
  setPin: (v: string) => void
  confirmPin: string
  setConfirmPin: (v: string) => void
  creating: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <form onSubmit={onSubmit} className="w-full space-y-4 text-left">
      <div>
        <Label htmlFor="nickname">Nickname</Label>
        <Input
          id="nickname"
          placeholder="Enter nickname (2-20 characters)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          disabled={creating}
          maxLength={20}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pin">Secret PIN</Label>
          <Input
            id="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="****"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            disabled={creating}
            maxLength={4}
            className="text-center tracking-widest"
          />
        </div>
        <div>
          <Label htmlFor="confirmPin">Confirm PIN</Label>
          <Input
            id="confirmPin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="****"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            disabled={creating}
            maxLength={4}
            className="text-center tracking-widest"
          />
        </div>
      </div>

      <p className="text-xs text-gray-500">
        The PIN keeps your siblings out of your account!
      </p>

      <Button
        type="submit"
        className="w-full cursor-pointer"
        disabled={creating || !nickname.trim() || pin.length !== 4 || confirmPin.length !== 4}
      >
        {creating ? 'Creating...' : 'Create Player'}
      </Button>
    </form>
  )
}

/** Error message banner */
function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-3 w-full rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
      {message}
    </div>
  )
}
