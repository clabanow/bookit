/**
 * Host Page
 *
 * The main page for game hosts. Flow:
 * 1. Host selects a question set
 * 2. Host clicks "Create Room"
 * 3. We connect to Socket.IO and emit host:create_room
 * 4. Server responds with room code
 * 5. We show the LobbyView with the code
 *
 * This is a client component because it:
 * - Uses browser-only Socket.IO
 * - Manages state with React hooks
 * - Responds to real-time events
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LobbyView } from '@/components/host/LobbyView'
import { SetSelector } from '@/components/host/SetSelector'
import { getSocket, disconnectSocket } from '@/lib/realtime/client'

// Game states the host page can be in
type HostState = 'initial' | 'creating' | 'lobby' | 'error'

interface Player {
  playerId: string
  nickname: string
  connected: boolean
}

export default function HostPage() {
  // Check for stored session to set initial state
  const [state, setState] = useState<HostState>(() => {
    // Only run on client side
    if (typeof window !== 'undefined' && localStorage.getItem('bookit_host_session')) {
      return 'creating' // Will attempt reconnection
    }
    return 'initial'
  })
  const [roomCode, setRoomCode] = useState<string>('')
  const [sessionId, setSessionId] = useState<string>('')
  const [players, setPlayers] = useState<Player[]>([])
  const [error, setError] = useState<string>('')
  const attemptedReconnect = useRef(false)

  // Selected question set
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const [selectedSetTitle, setSelectedSetTitle] = useState<string>('')

  // Check for existing session on mount (for reconnection)
  useEffect(() => {
    if (attemptedReconnect.current) return

    const storedSessionId = localStorage.getItem('bookit_host_session')

    if (storedSessionId) {
      console.log('Found stored session, attempting reconnection:', storedSessionId)
      attemptedReconnect.current = true

      const socket = getSocket({ role: 'host' })

      // Set up listeners first
      socket.on('host:reconnected', (data) => {
        console.log('Host reconnected:', data)
        setSessionId(data.sessionId)
        setRoomCode(data.roomCode)
        setPlayers(data.players)
        setState('lobby')
      })

      socket.on('room:roster_update', (data) => {
        console.log('Roster update:', data)
        setPlayers(data.players)
      })

      socket.on('error', (data) => {
        console.error('Reconnection error:', data)
        // Clear stored session on error (it's probably expired)
        localStorage.removeItem('bookit_host_session')
        setState('initial')
      })

      // Attempt reconnection when connected
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

  // Handle question set selection
  const handleSelectSet = useCallback((setId: string, setTitle: string) => {
    setSelectedSetId(setId)
    setSelectedSetTitle(setTitle)
  }, [])

  // Create a room when the button is clicked
  const handleCreateRoom = useCallback(() => {
    if (!selectedSetId) return

    setState('creating')
    setError('')

    const socket = getSocket({ role: 'host' })

    // Listen for room created response
    socket.on('room:created', (data) => {
      console.log('Room created:', data)
      setRoomCode(data.roomCode)
      setSessionId(data.sessionId)
      // Store session ID for reconnection
      localStorage.setItem('bookit_host_session', data.sessionId)
      setState('lobby')
    })

    // Listen for roster updates (players joining/leaving)
    socket.on('room:roster_update', (data) => {
      console.log('Roster update:', data)
      setPlayers(data.players)
    })

    // Listen for errors
    socket.on('error', (data) => {
      console.error('Socket error:', data)
      setError(data.message)
      setState('error')
    })

    // Wait for connection then create room
    if (socket.connected) {
      socket.emit('host:create_room', { questionSetId: selectedSetId })
    } else {
      socket.on('connect', () => {
        socket.emit('host:create_room', { questionSetId: selectedSetId })
      })
    }
  }, [selectedSetId])

  // Handle start game button
  const handleStartGame = useCallback(() => {
    if (!sessionId) return

    const socket = getSocket({ role: 'host' })
    socket.emit('host:start_game', { sessionId })

    console.log('🎮 Starting game for session:', sessionId)
  }, [sessionId])

  // Handle kick player
  const handleKickPlayer = useCallback(
    (playerId: string) => {
      if (!sessionId) return

      const socket = getSocket({ role: 'host' })
      socket.emit('host:kick_player', { sessionId, playerId })

      console.log('🚫 Kicking player:', playerId)
    },
    [sessionId]
  )

  // Render lobby view when room is created
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

  // Render the initial setup screen
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-8">
      <h1 className="mb-8 text-4xl font-bold text-blue-600">Host a Game</h1>

      {state === 'error' && (
        <div className="mb-6 rounded-lg bg-red-100 px-6 py-4 text-red-700">
          <p className="font-medium">Error: {error}</p>
          <button
            onClick={() => setState('initial')}
            className="mt-2 text-sm underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="w-full max-w-md space-y-6">
        {/* Question set selector */}
        <SetSelector onSelect={handleSelectSet} selectedId={selectedSetId ?? undefined} />

        {/* Create room button */}
        <Button
          size="lg"
          onClick={handleCreateRoom}
          disabled={!selectedSetId || state === 'creating'}
          className="w-full"
        >
          {state === 'creating'
            ? 'Creating Room...'
            : selectedSetId
              ? 'Create Room'
              : 'Select a Question Set First'}
        </Button>

        {/* Links */}
        <div className="text-center">
          <Link href="/host/sets" className="text-sm text-blue-600 hover:underline">
            Manage Question Sets
          </Link>
        </div>
      </div>
    </div>
  )
}
