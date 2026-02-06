/**
 * Socket Connection Status Component
 *
 * Displays the current Socket.IO connection status.
 * Used for development/debugging to verify the realtime connection works.
 *
 * This is a client component because it:
 * 1. Uses browser-only Socket.IO client
 * 2. Manages connection state with React hooks
 * 3. Needs to respond to connection events
 */

'use client'

import { useEffect, useState } from 'react'
import { getSocket, disconnectSocket } from '@/lib/realtime/client'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export function SocketStatus() {
  // Start in 'connecting' state since we'll connect immediately on mount
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [socketId, setSocketId] = useState<string | null>(null)

  useEffect(() => {
    // Connect when component mounts
    const socket = getSocket({ role: 'player' })

    // Listen for connection events
    socket.on('connect', () => {
      setStatus('connected')
      setSocketId(socket.id ?? null)
      console.log('Socket connected:', socket.id)
    })

    socket.on('disconnect', () => {
      setStatus('disconnected')
      setSocketId(null)
    })

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      setStatus('disconnected')
    })

    // Clean up on unmount
    return () => {
      disconnectSocket()
    }
  }, [])

  // Status indicator colors
  const statusColors = {
    disconnected: 'bg-red-500',
    connecting: 'bg-yellow-500 animate-pulse',
    connected: 'bg-green-500',
  }

  return (
    <div className="fixed bottom-2 right-2 md:bottom-4 md:right-4 flex items-center gap-1.5 md:gap-2 rounded-lg bg-white px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm shadow-lg opacity-70 hover:opacity-100 transition-opacity">
      <div className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
      <span className="text-gray-600">
        {status === 'connected' ? `Connected (${socketId?.slice(0, 8)}...)` : status}
      </span>
    </div>
  )
}
