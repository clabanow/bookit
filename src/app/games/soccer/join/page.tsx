/**
 * Soccer Stud Join Page
 *
 * Same flow as quiz join, but redirects to /games/soccer/play/ after joining.
 * Uses green theme.
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlayerSelector } from '@/components/player'
import { getSocket, disconnectSocket } from '@/lib/realtime/client'

type JoinState = 'auth_check' | 'room_code' | 'select_player' | 'joining' | 'success' | 'error'

interface Player {
  id: string
  nickname: string
  avatar: string | null
}

export default function SoccerJoinPage() {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [state, setState] = useState<JoinState>('auth_check')
  const [error, setError] = useState('')

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.status === 401) {
          router.push('/login?redirect=/games/soccer/join')
          return
        }
        if (!res.ok) throw new Error('Auth check failed')
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
        setState('success')
        sessionStorage.setItem('playerId', data.playerId)
        sessionStorage.setItem('sessionId', data.sessionId)
        sessionStorage.setItem('playerNickname', player.nickname)
        // Key difference: redirect to soccer play page
        router.push(`/games/soccer/play/${data.sessionId}`)
      })

      socket.on('error', (data) => {
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

  if (state === 'auth_check') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white p-4 md:p-8">
        <p className="text-gray-500">Checking authentication...</p>
      </div>
    )
  }

  if (state === 'error' && !roomCode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white p-4 md:p-8">
        <div className="w-full max-w-sm rounded-lg bg-red-100 px-4 md:px-6 py-4 text-center text-red-700 mb-4">
          <p>{error}</p>
        </div>
        <Button onClick={() => router.push('/')}>Go Home</Button>
      </div>
    )
  }

  if (state === 'select_player') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-8">
        <div className="mb-4 text-center">
          <p className="text-slate-400 text-sm md:text-base">Joining Soccer Stud room</p>
          <p className="text-xl md:text-2xl font-mono font-bold text-white tracking-widest">
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

  if (state === 'joining') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white p-4 md:p-8">
        <h1 className="mb-4 text-3xl md:text-4xl font-bold text-green-600">Joining...</h1>
        <p className="text-gray-600">Connecting as {selectedPlayer?.nickname}</p>
      </div>
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
      <p className="mb-6 md:mb-8 text-sm text-gray-500">Join a Game</p>

      {state === 'error' && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 md:mb-6 w-full max-w-sm rounded-lg bg-red-100 px-4 md:px-6 py-4 text-center text-red-700"
        >
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleRoomCodeSubmit} className="flex w-full max-w-sm flex-col gap-4 px-4 md:px-0">
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
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center font-mono text-xl md:text-2xl uppercase tracking-widest focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
            maxLength={6}
            autoComplete="off"
            autoFocus
          />
        </div>

        <Button
          size="lg"
          type="submit"
          disabled={roomCode.length < 6}
          className="mt-2 bg-green-600 hover:bg-green-700"
        >
          Continue
        </Button>
      </form>

      <p className="mt-6 md:mt-8 text-sm text-gray-500 text-center">
        Ask your host for the 6-character room code
      </p>
    </div>
  )
}
