/**
 * Join Page
 *
 * Players enter a room code and select a player profile to join a game.
 * On success, they're redirected to the play page.
 *
 * Flow:
 * 1. Check if user is authenticated
 * 2. If not, redirect to login
 * 3. Player enters room code
 * 4. Player selects their profile (or creates one if none exist)
 * 5. We connect to Socket.IO and emit player:join_room
 * 6. Server validates and adds player to room
 * 7. On success, redirect to /play/[sessionId]
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PlayerSelector } from '@/components/player'
import { getSocket, disconnectSocket } from '@/lib/realtime/client'

type JoinState = 'auth_check' | 'room_code' | 'select_player' | 'joining' | 'success' | 'error'

interface Player {
  id: string
  nickname: string
  avatar: string | null
}

export default function JoinPage() {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [state, setState] = useState<JoinState>('auth_check')
  const [error, setError] = useState('')

  // Check authentication on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.status === 401) {
          // Not logged in - redirect to login
          router.push('/login?redirect=/join')
          return
        }
        if (!res.ok) {
          throw new Error('Auth check failed')
        }
        const data = await res.json()
        if (data.status !== 'APPROVED') {
          setError('Your account is pending approval')
          setState('error')
          return
        }
        setState('room_code')
      } catch {
        setError('Failed to verify authentication')
        setState('error')
      }
    }
    checkAuth()
  }, [router])

  // Clean up socket if we leave before joining
  useEffect(() => {
    return () => {
      if (state !== 'success') {
        disconnectSocket()
      }
    }
  }, [state])

  const handleRoomCodeSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (roomCode.trim().length !== 6) {
        setError('Room code must be 6 characters')
        setState('error')
        return
      }

      setState('select_player')
      setError('')
    },
    [roomCode]
  )

  const handlePlayerSelect = useCallback(
    (player: Player) => {
      setSelectedPlayer(player)
      setState('joining')
      setError('')

      const socket = getSocket({ role: 'player' })

      socket.on('player:joined', (data) => {
        console.log('Joined room:', data)
        setState('success')

        sessionStorage.setItem('playerId', data.playerId)
        sessionStorage.setItem('sessionId', data.sessionId)
        sessionStorage.setItem('playerNickname', player.nickname)

        router.push(`/play/${data.sessionId}`)
      })

      socket.on('error', (data) => {
        console.error('Join error:', data)
        setError(data.message)
        setState('error')
      })

      const joinRoom = () => {
        socket.emit('player:join_room', {
          roomCode: roomCode.trim().toUpperCase(),
          nickname: player.nickname,
        })
      }

      if (socket.connected) {
        joinRoom()
      } else {
        socket.on('connect', joinRoom)
      }
    },
    [roomCode, router]
  )

  // Loading state while checking auth
  if (state === 'auth_check') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-8">
        <p className="text-gray-500">Checking authentication...</p>
      </div>
    )
  }

  // Error state
  if (state === 'error' && !roomCode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-8">
        <div className="w-full max-w-sm rounded-lg bg-red-100 px-6 py-4 text-center text-red-700 mb-4">
          <p>{error}</p>
        </div>
        <Button onClick={() => router.push('/')}>Go Home</Button>
      </div>
    )
  }

  // Player selector screen
  if (state === 'select_player') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-8">
        <div className="mb-4 text-center">
          <p className="text-slate-400">Joining room</p>
          <p className="text-2xl font-mono font-bold text-white tracking-widest">
            {roomCode.toUpperCase()}
          </p>
        </div>
        <PlayerSelector
          onSelect={handlePlayerSelect}
          onCancel={() => setState('room_code')}
        />
      </div>
    )
  }

  // Joining state
  if (state === 'joining') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-8">
        <h1 className="mb-4 text-4xl font-bold text-blue-600">Joining...</h1>
        <p className="text-gray-600">Connecting as {selectedPlayer?.nickname}</p>
      </div>
    )
  }

  // Room code entry screen (default)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-8">
      <h1 className="mb-8 text-4xl font-bold text-blue-600">Join a Game</h1>

      {state === 'error' && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-6 w-full max-w-sm rounded-lg bg-red-100 px-6 py-4 text-center text-red-700"
        >
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleRoomCodeSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <div>
          <label htmlFor="roomCode" className="mb-1 block text-sm font-medium text-gray-700">
            Room Code
          </label>
          <input
            id="roomCode"
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center font-mono text-2xl uppercase tracking-widest focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            maxLength={6}
            autoComplete="off"
            autoFocus
          />
        </div>

        <Button size="lg" type="submit" disabled={roomCode.length < 6} className="mt-2">
          Continue
        </Button>
      </form>

      <p className="mt-8 text-sm text-gray-500">
        Ask your host for the 6-character room code
      </p>
    </div>
  )
}
