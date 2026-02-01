/**
 * Disconnect Handler
 *
 * Handles socket disconnections for both hosts and players.
 * When a player disconnects, we mark them as disconnected (not remove them)
 * so they can potentially reconnect later.
 */

import type { Server, Socket } from 'socket.io'
import { getSessionStore } from '@/lib/session'

/**
 * Handle a socket disconnection.
 *
 * We need to find which session this socket was part of and update accordingly.
 * This is called for all socket disconnections (hosts and players).
 *
 * @param io - The Socket.IO server (for broadcasting)
 * @param socket - The disconnected socket
 */
export async function handleDisconnect(io: Server, socket: Socket): Promise<void> {
  const store = getSessionStore()

  // We need to find which session this socket belongs to
  // Socket.IO rooms tell us which sessions this socket was in
  const rooms = Array.from(socket.rooms)

  // The first room is always the socket's own ID, so skip it
  // Other rooms are sessionIds the socket joined
  for (const room of rooms) {
    if (room === socket.id) continue // Skip the socket's own room

    const session = await store.getSession(room)
    if (!session) continue

    // Check if this is the host
    if (session.hostSocketId === socket.id) {
      console.log(`👑 Host disconnected from room ${session.roomCode}`)

      // Mark host as disconnected
      await store.updateSession(session.sessionId, {
        hostConnected: false,
        hostDisconnectedAt: Date.now(),
      })

      // Notify all players that host disconnected
      io.to(session.sessionId).emit('host:disconnected', {
        message: 'Host has disconnected. Waiting for them to reconnect...',
        timestamp: Date.now(),
      })

      return
    }

    // Find the player with this socket ID
    const players = await store.getPlayers(session.sessionId)
    const player = players.find((p) => p.socketId === socket.id)

    if (player) {
      // Mark player as disconnected
      await store.updatePlayer(session.sessionId, player.playerId, {
        connected: false,
      })

      // Get updated player list and broadcast
      const updatedPlayers = await store.getPlayers(session.sessionId)
      const playerList = updatedPlayers.map((p) => ({
        playerId: p.playerId,
        nickname: p.nickname,
        connected: p.connected,
      }))

      io.to(session.sessionId).emit('room:roster_update', {
        players: playerList,
        count: playerList.filter((p) => p.connected).length,
      })

      console.log(`📤 Player "${player.nickname}" disconnected from room ${session.roomCode}`)
      return
    }
  }
}
