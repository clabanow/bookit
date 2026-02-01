/**
 * Socket.IO Client
 *
 * This module provides a client-side socket connection to the game server.
 * It's used by React components to send and receive real-time events.
 *
 * Key concepts:
 * - We use a singleton pattern: one socket connection per browser tab
 * - The socket auto-reconnects if the connection drops
 * - Query parameters tell the server who we are (host or player)
 */

'use client'

import { io, Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@/server/socket'

// Typed socket that knows about our events
type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

// Singleton socket instance
let socket: TypedSocket | null = null

// Connection options that can be passed when connecting
export interface ConnectionOptions {
  role: 'host' | 'player'
  sessionId?: string
  playerId?: string
}

/**
 * Get or create the socket connection.
 *
 * This uses a singleton pattern - calling this multiple times returns the same socket.
 * This prevents accidentally creating multiple connections from the same browser tab.
 *
 * @param options - Connection options including role and optional session/player IDs
 * @returns The socket instance
 */
export function getSocket(options: ConnectionOptions): TypedSocket {
  if (socket) {
    // If already connected with different options, disconnect and reconnect
    // This handles the case where a user navigates from host to player pages
    const currentQuery = socket.io.opts.query as Record<string, string> | undefined
    if (currentQuery?.role !== options.role) {
      socket.disconnect()
      socket = null
    } else {
      return socket
    }
  }

  // Determine the server URL
  // In development, we connect to the same origin (our custom server)
  // The custom server handles both Next.js and Socket.IO
  const url =
    typeof window !== 'undefined'
      ? window.location.origin // Use same origin as the page
      : 'http://localhost:3000'

  socket = io(url, {
    // Query parameters are sent with the initial connection
    // The server uses these to identify the client's role
    query: {
      role: options.role,
      sessionId: options.sessionId,
      playerId: options.playerId,
    },

    // Auto-reconnection settings
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,

    // Transport settings
    // We prefer WebSocket but fall back to long-polling if needed
    transports: ['websocket', 'polling'],
  })

  // Set up debug logging in development
  if (process.env.NODE_ENV !== 'production') {
    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket?.id)
    })

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason)
    })

    socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error.message)
    })
  }

  return socket
}

/**
 * Disconnect the current socket connection.
 *
 * Call this when the user leaves the game or navigates away.
 * The server will detect this and handle cleanup.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

/**
 * Check if currently connected.
 *
 * Useful for showing connection status in the UI.
 */
export function isConnected(): boolean {
  return socket?.connected ?? false
}

/**
 * React hook for socket connection status.
 *
 * This will be expanded in future tasks to provide a more React-friendly interface.
 * For now, components can use getSocket() directly and set up their own event listeners.
 */
// TODO: Create useSocket hook in a future task for cleaner React integration
