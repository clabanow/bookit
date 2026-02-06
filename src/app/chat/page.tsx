'use client'

/**
 * Global Chat Page
 *
 * Full-page chat interface for the global channel.
 * If the user has multiple players, they pick which one to chat as.
 * Uses the ?playerId= pattern consistent with /shop and /collection.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChatPanel } from '@/components/chat/ChatPanel'

interface Player {
  id: string
  nickname: string
  coins: number
}

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const playerId = searchParams.get('playerId')

  const [players, setPlayers] = useState<Player[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchPlayers = useCallback(async () => {
    try {
      // Fetch the user's session to get userId
      const meRes = await fetch('/api/auth/me')
      if (meRes.status === 401) {
        router.push('/login?redirect=/chat')
        return
      }
      const meData = await meRes.json()
      setUserId(meData.user.id)

      // Fetch players
      const res = await fetch('/api/players')
      if (!res.ok) throw new Error('Failed to load players')
      const data = await res.json()
      setPlayers(data.players)

      // If no playerId in URL but user has exactly one player, auto-select
      if (!playerId && data.players.length === 1) {
        router.replace(`/chat?playerId=${data.players[0].id}`)
      }
    } catch {
      setError('Failed to load players')
    } finally {
      setLoading(false)
    }
  }, [playerId, router])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  // No players — need to create one first
  if (players.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
        <p className="text-slate-400 mb-4">You need a player profile to chat.</p>
        <Button onClick={() => router.push('/account/players')}>
          Create Player
        </Button>
      </div>
    )
  }

  // Multiple players and none selected — show picker
  if (!playerId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-white mb-2">Chat</h1>
          <p className="text-slate-400 mb-6">Choose who you want to chat as:</p>
          <div className="space-y-3">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => router.replace(`/chat?playerId=${p.id}`)}
                className="w-full p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-blue-500 transition-colors text-left flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                  {p.nickname.charAt(0).toUpperCase()}
                </div>
                <span className="text-white font-medium">{p.nickname}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Find the selected player
  const selectedPlayer = players.find((p) => p.id === playerId)
  if (!selectedPlayer || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <p className="text-red-400">Player not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Chat</h1>
            <p className="text-slate-400 text-sm">
              Chatting as <span className="text-blue-400 font-medium">{selectedPlayer.nickname}</span>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/')}>
            Back
          </Button>
        </div>

        {/* Chat panel */}
        <ChatPanel
          channel="global"
          playerId={playerId}
          userId={userId}
          playerNickname={selectedPlayer.nickname}
          mode="full"
        />
      </div>
    </div>
  )
}
