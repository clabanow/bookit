/**
 * Host Lobby View
 *
 * Displays the waiting room where hosts see their room code
 * and wait for players to join.
 *
 * Features:
 * - Large, easy-to-read room code (for projection/screen sharing)
 * - Player roster showing who has joined
 * - Start game button (enabled when players have joined)
 */

'use client'

import { Button } from '@/components/ui/button'
import { PlayerRoster } from './PlayerRoster'

interface Player {
  playerId: string
  nickname: string
  connected: boolean
}

interface LobbyViewProps {
  roomCode: string
  players: Player[]
  onStartGame: () => void
  onKickPlayer?: (playerId: string) => void
  isStarting?: boolean
  questionSetTitle?: string
}

export function LobbyView({
  roomCode,
  players,
  onStartGame,
  onKickPlayer,
  isStarting,
  questionSetTitle,
}: LobbyViewProps) {
  // Can only start if there's at least one connected player
  const connectedPlayers = players.filter((p) => p.connected)
  const canStart = connectedPlayers.length > 0 && !isStarting

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-600 to-blue-800 p-4 md:p-8 text-white">
      {/* Question Set Info */}
      {questionSetTitle && (
        <div className="mb-4 md:mb-6 text-center">
          <p className="text-base md:text-lg opacity-80">Playing:</p>
          <p className="text-xl md:text-2xl font-semibold">{questionSetTitle}</p>
        </div>
      )}

      {/* Room Code Section */}
      <div className="mb-8 md:mb-12 text-center">
        <p className="mb-2 text-base md:text-xl opacity-80">Join at bookit.app with code:</p>
        <div className="rounded-2xl bg-white px-4 py-4 md:px-8 md:py-6 shadow-2xl">
          <span className="font-mono text-4xl sm:text-5xl md:text-6xl font-bold tracking-widest text-blue-600">
            {roomCode}
          </span>
        </div>
      </div>

      {/* Player Roster */}
      <div className="mb-6 md:mb-8 w-full max-w-md">
        <PlayerRoster players={players} onKickPlayer={onKickPlayer} />
      </div>

      {/* Start Button */}
      <Button
        size="lg"
        onClick={onStartGame}
        disabled={!canStart}
        className="bg-green-500 px-8 py-4 md:px-12 md:py-6 text-lg md:text-xl font-bold hover:bg-green-600 disabled:opacity-50"
      >
        {isStarting ? 'Starting...' : 'Start Game'}
      </Button>

      {!canStart && connectedPlayers.length === 0 && (
        <p className="mt-4 text-sm opacity-70">
          Need at least 1 player to start
        </p>
      )}
    </div>
  )
}
