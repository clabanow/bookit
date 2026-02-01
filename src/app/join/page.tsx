/**
 * Join Page
 *
 * Players enter a room code and nickname to join a game.
 * On success, they're redirected to the play page.
 *
 * Flow:
 * 1. Player enters room code + nickname
 * 2. We connect to Socket.IO and emit player:join_room
 * 3. Server validates and adds player to room
 * 4. On success, redirect to /play/[sessionId]
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getSocket, disconnectSocket } from '@/lib/realtime/client'

type JoinState = 'idle' | 'joining' | 'success' | 'error'

export default function JoinPage() {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [state, setState] = useState<JoinState>('idle')
  const [error, setError] = useState('')

  // Clean up socket if we leave before joining
  useEffect(() => {
    return () => {
      // Only disconnect if we haven't successfully joined
      // (if joined, we keep the connection for the game)
      if (state !== 'success') {
        disconnectSocket()
      }
    }
  }, [state])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      // Basic client-side validation
      if (roomCode.trim().length !== 6) {
        setError('Room code must be 6 characters')
        setState('error')
        return
      }

      if (nickname.trim().length < 2) {
        setError('Nickname must be at least 2 characters')
        setState('error')
        return
      }

      setState('joining')
      setError('')

      const socket = getSocket({ role: 'player' })

      // Listen for success
      socket.on('player:joined', (data) => {
        console.log('Joined room:', data)
        setState('success')

        // Store player info for the game page
        sessionStorage.setItem('playerId', data.playerId)
        sessionStorage.setItem('sessionId', data.sessionId)

        // Navigate to the game
        router.push(`/play/${data.sessionId}`)
      })

      // Listen for errors
      socket.on('error', (data) => {
        console.error('Join error:', data)
        setError(data.message)
        setState('error')
      })

      // Wait for connection then join
      const joinRoom = () => {
        socket.emit('player:join_room', {
          roomCode: roomCode.trim().toUpperCase(),
          nickname: nickname.trim(),
        })
      }

      if (socket.connected) {
        joinRoom()
      } else {
        socket.on('connect', joinRoom)
      }
    },
    [roomCode, nickname, router]
  )

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

      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
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
            disabled={state === 'joining'}
            autoComplete="off"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="nickname" className="mb-1 block text-sm font-medium text-gray-700">
            Your Nickname
          </label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter your name"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            maxLength={20}
            disabled={state === 'joining'}
            autoComplete="off"
          />
        </div>

        <Button
          size="lg"
          type="submit"
          disabled={state === 'joining' || roomCode.length < 6 || nickname.length < 2}
          className="mt-2"
        >
          {state === 'joining' ? 'Joining...' : 'Join Game'}
        </Button>
      </form>

      <p className="mt-8 text-sm text-gray-500">
        Ask your host for the 6-character room code
      </p>
    </div>
  )
}
