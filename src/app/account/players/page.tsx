'use client'

/**
 * Player Management Page
 *
 * Users can create up to 3 player sub-accounts with different nicknames.
 * Each player has a secret 4-digit PIN to keep siblings out!
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface Player {
  id: string
  nickname: string
  avatar: string | null
  createdAt: string
}

export default function PlayersPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [maxPlayers, setMaxPlayers] = useState(3)
  const [canCreateMore, setCanCreateMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form state
  const [nickname, setNickname] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchPlayers = useCallback(async () => {
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
      setMaxPlayers(data.maxPlayers)
      setCanCreateMore(data.canCreateMore)
    } catch {
      setError('Failed to load players')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validate PIN
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

      // Success - refresh list and clear form
      setNickname('')
      setPin('')
      setConfirmPin('')
      await fetchPlayers()
    } catch {
      setError('Network error')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(playerId: string) {
    if (!confirm('Are you sure you want to delete this player?')) {
      return
    }

    setDeleting(playerId)
    setError('')

    try {
      const res = await fetch(`/api/players/${playerId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete player')
      }

      await fetchPlayers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete player')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <p className="text-slate-400">Loading players...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Players</h1>
            <p className="text-slate-400">
              Create up to {maxPlayers} player profiles for your account
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/host')}>
            Back
          </Button>
        </div>

        {/* Create player form */}
        {canCreateMore && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Player</CardTitle>
              <CardDescription>
                Each player gets their own secret 4-digit PIN
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
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

                <p className="text-xs text-slate-500">
                  The PIN keeps your siblings out of your account!
                </p>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={creating || !nickname.trim() || pin.length !== 4 || confirmPin.length !== 4}
                >
                  {creating ? 'Creating...' : 'Create Player'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Players list */}
        <Card>
          <CardHeader>
            <CardTitle>Your Players ({players.length}/{maxPlayers})</CardTitle>
          </CardHeader>
          <CardContent>
            {players.length === 0 ? (
              <p className="text-slate-400 text-center py-4">
                No players yet. Create your first player above!
              </p>
            ) : (
              <div className="space-y-3">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {player.nickname.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{player.nickname}</p>
                        <p className="text-xs text-slate-400">
                          Created {new Date(player.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                      disabled={deleting === player.id}
                      onClick={() => handleDelete(player.id)}
                    >
                      {deleting === player.id ? '...' : 'Delete'}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!canCreateMore && (
              <p className="text-sm text-slate-400 text-center mt-4">
                You&apos;ve reached the maximum of {maxPlayers} players
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
