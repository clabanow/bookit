/**
 * Player Roster Component
 *
 * Displays the list of players in the game lobby.
 * Shows connection status for each player.
 * Allows host to kick players.
 */

'use client'

import { useState } from 'react'

interface Player {
  playerId: string
  nickname: string
  connected: boolean
}

interface PlayerRosterProps {
  players: Player[]
  onKickPlayer?: (playerId: string) => void
  showKickButtons?: boolean
}

export function PlayerRoster({
  players,
  onKickPlayer,
  showKickButtons = true,
}: PlayerRosterProps) {
  const connectedCount = players.filter((p) => p.connected).length
  const [kickingPlayer, setKickingPlayer] = useState<string | null>(null)

  const handleKick = (playerId: string, nickname: string) => {
    if (window.confirm(`Kick ${nickname} from the game?`)) {
      setKickingPlayer(playerId)
      onKickPlayer?.(playerId)
      // Reset after a delay (the player will be removed from roster via socket)
      setTimeout(() => setKickingPlayer(null), 2000)
    }
  }

  if (players.length === 0) {
    return (
      <div className="rounded-xl bg-white/10 p-8 text-center">
        <p className="text-lg opacity-80">Waiting for players to join...</p>
        <div className="mt-4 flex justify-center gap-2">
          <span className="h-3 w-3 animate-bounce rounded-full bg-white/60 [animation-delay:-0.3s]" />
          <span className="h-3 w-3 animate-bounce rounded-full bg-white/60 [animation-delay:-0.15s]" />
          <span className="h-3 w-3 animate-bounce rounded-full bg-white/60" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-4 text-center text-2xl font-semibold">
        Players ({connectedCount}/{players.length})
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {players.map((player) => (
          <div
            key={player.playerId}
            className={`group relative flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-center transition-opacity ${
              player.connected ? 'bg-white/20' : 'bg-white/10 opacity-50'
            }`}
          >
            {/* Connection indicator */}
            <span
              className={`h-2 w-2 rounded-full ${
                player.connected ? 'bg-green-400' : 'bg-gray-400'
              }`}
            />
            <span className="font-medium">{player.nickname}</span>

            {/* Kick button - shows on hover */}
            {showKickButtons && onKickPlayer && (
              <button
                onClick={() => handleKick(player.playerId, player.nickname)}
                disabled={kickingPlayer === player.playerId}
                className="absolute -right-1 -top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:flex group-hover:opacity-100"
                aria-label={`Kick ${player.nickname}`}
                title={`Kick ${player.nickname}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
