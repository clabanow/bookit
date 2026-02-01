'use client'

/**
 * Player Selector Component
 *
 * Allows users to select which of their player profiles to use when joining a game.
 * Each player requires entering their secret 4-digit PIN to prevent siblings from
 * using the wrong account!
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface Player {
  id: string
  nickname: string
  avatar: string | null
}

interface PlayerSelectorProps {
  onSelect: (player: Player) => void
  onCancel?: () => void
}

export function PlayerSelector({ onSelect, onCancel }: PlayerSelectorProps) {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // PIN entry state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [pinError, setPinError] = useState('')

  useEffect(() => {
    async function fetchPlayers() {
      try {
        const res = await fetch('/api/players')

        if (res.status === 401) {
          router.push('/login')
          return
        }

        if (!res.ok) {
          throw new Error('Failed to fetch players')
        }

        const data = await res.json()
        setPlayers(data.players)
      } catch {
        setError('Failed to load players')
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [router])

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPlayerId || pin.length !== 4) return

    setVerifying(true)
    setPinError('')

    try {
      const res = await fetch(`/api/players/${selectedPlayerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      const data = await res.json()

      if (!res.ok) {
        setPinError(data.error || 'Wrong PIN')
        setPin('')
        return
      }

      // Success - pass the player to parent
      onSelect(data.player)
    } catch {
      setPinError('Failed to verify PIN')
    } finally {
      setVerifying(false)
    }
  }

  function handleBackToSelection() {
    setSelectedPlayerId(null)
    setPin('')
    setPinError('')
  }

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <p className="text-slate-400">Loading players...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  // No players - prompt to create one
  if (players.length === 0) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>No Players Yet</CardTitle>
          <CardDescription>
            Create a player profile before joining a game
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={() => router.push('/account/players')}>
            Create Player
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // PIN entry screen
  if (selectedPlayerId) {
    const selectedPlayer = players.find((p) => p.id === selectedPlayerId)

    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl">
            {selectedPlayer?.nickname.charAt(0).toUpperCase()}
          </div>
          <CardTitle>{selectedPlayer?.nickname}</CardTitle>
          <CardDescription>Enter your secret PIN</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="****"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-[0.5em] font-mono"
              autoFocus
              disabled={verifying}
            />

            {pinError && (
              <p className="text-red-400 text-sm text-center">{pinError}</p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleBackToSelection}
                disabled={verifying}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={pin.length !== 4 || verifying}
              >
                {verifying ? 'Checking...' : 'Enter'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  // Player selection screen
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Who&apos;s Playing?</CardTitle>
        <CardDescription>Select your player profile</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {players.map((player) => (
          <button
            key={player.id}
            onClick={() => setSelectedPlayerId(player.id)}
            className="w-full flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
              {player.nickname.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-white">{player.nickname}</span>
          </button>
        ))}

        {onCancel && (
          <Button variant="outline" className="w-full mt-4" onClick={onCancel}>
            Cancel
          </Button>
        )}

        <p className="text-xs text-slate-500 text-center pt-2">
          <a
            href="/account/players"
            className="text-blue-400 hover:text-blue-300"
          >
            Manage players
          </a>
        </p>
      </CardContent>
    </Card>
  )
}
