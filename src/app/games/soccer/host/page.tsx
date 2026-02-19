/**
 * Soccer Stud Host Page
 *
 * Same flow as quiz host, but creates a 'soccer' game type.
 * Uses green theme instead of blue. Emits gameType: 'soccer'
 * when creating the room so the server branches to penalty logic.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LobbyView } from '@/components/host/LobbyView'
import { SetSelector } from '@/components/host/SetSelector'
import { getSocket, disconnectSocket } from '@/lib/realtime/client'

type HostState = 'initial' | 'creating' | 'lobby' | 'error'

interface Player {
  playerId: string
  nickname: string
  connected: boolean
}

export default function SoccerHostPage() {
  const [state, setState] = useState<HostState>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('mack_soccer_host_session')) {
      return 'creating'
    }
    return 'initial'
  })
  const [roomCode, setRoomCode] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [error, setError] = useState('')
  const attemptedReconnect = useRef(false)

  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const [selectedSetTitle, setSelectedSetTitle] = useState('')

  // Reconnection logic
  useEffect(() => {
    if (attemptedReconnect.current) return

    const storedSessionId = localStorage.getItem('mack_soccer_host_session')
    if (storedSessionId) {
      attemptedReconnect.current = true
      const socket = getSocket({ role: 'host' })

      socket.on('host:reconnected', (data) => {
        setSessionId(data.sessionId)
        setRoomCode(data.roomCode)
        setPlayers(data.players)
        setState('lobby')
      })

      socket.on('room:roster_update', (data) => {
        setPlayers(data.players)
      })

      socket.on('error', () => {
        localStorage.removeItem('mack_soccer_host_session')
        setState('initial')
      })

      const tryReconnect = () => {
        socket.emit('host:reconnect', { sessionId: storedSessionId })
      }

      if (socket.connected) {
        tryReconnect()
      } else {
        socket.on('connect', tryReconnect)
      }
    }

    return () => {
      disconnectSocket()
    }
  }, [])

  const handleSelectSet = useCallback((setId: string, setTitle: string) => {
    setSelectedSetId(setId)
    setSelectedSetTitle(setTitle)
  }, [])

  const handleCreateRoom = useCallback(() => {
    if (!selectedSetId) return

    setState('creating')
    setError('')

    const socket = getSocket({ role: 'host' })

    socket.on('room:created', (data) => {
      setRoomCode(data.roomCode)
      setSessionId(data.sessionId)
      localStorage.setItem('mack_soccer_host_session', data.sessionId)
      setState('lobby')
    })

    socket.on('room:roster_update', (data) => {
      setPlayers(data.players)
    })

    socket.on('error', (data) => {
      setError(data.message)
      setState('error')
    })

    // Key difference: gameType: 'soccer'
    if (socket.connected) {
      socket.emit('host:create_room', { questionSetId: selectedSetId, gameType: 'soccer' })
    } else {
      socket.on('connect', () => {
        socket.emit('host:create_room', { questionSetId: selectedSetId, gameType: 'soccer' })
      })
    }
  }, [selectedSetId])

  const handleStartGame = useCallback(() => {
    if (!sessionId) return
    const socket = getSocket({ role: 'host' })
    socket.emit('host:start_game', { sessionId })
  }, [sessionId])

  const handleKickPlayer = useCallback(
    (playerId: string) => {
      if (!sessionId) return
      const socket = getSocket({ role: 'host' })
      socket.emit('host:kick_player', { sessionId, playerId })
    },
    [sessionId]
  )

  if (state === 'lobby') {
    return (
      <LobbyView
        roomCode={roomCode}
        players={players}
        onStartGame={handleStartGame}
        onKickPlayer={handleKickPlayer}
        questionSetTitle={selectedSetTitle}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white p-4 md:p-8">
      <Link
        href="/"
        className="mb-4 self-center text-sm text-gray-500 hover:text-green-600 hover:underline"
      >
        &larr; Back to Main Menu
      </Link>
      <h1 className="mb-2 text-3xl md:text-4xl font-bold text-green-600">
        <span className="mr-2">⚽</span>Soccer Stud
      </h1>
      <p className="mb-6 md:mb-8 text-sm text-gray-500">Host a Game</p>

      {state === 'error' && (
        <div className="mb-4 md:mb-6 rounded-lg bg-red-100 px-4 md:px-6 py-4 text-red-700">
          <p className="font-medium">Error: {error}</p>
          <button onClick={() => setState('initial')} className="mt-2 text-sm underline">
            Try again
          </button>
        </div>
      )}

      <div className="w-full max-w-md space-y-4 md:space-y-6 px-4 md:px-0">
        <SetSelector onSelect={handleSelectSet} selectedId={selectedSetId ?? undefined} />

        <Button
          size="lg"
          onClick={handleCreateRoom}
          disabled={!selectedSetId || state === 'creating'}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {state === 'creating'
            ? 'Creating Room...'
            : selectedSetId
              ? 'Create Room'
              : 'Select a Question Set First'}
        </Button>

        <div className="text-center">
          <Link href="/games/quiz/host/sets" className="text-sm text-green-600 hover:underline">
            Manage Question Sets
          </Link>
        </div>
      </div>
    </div>
  )
}
