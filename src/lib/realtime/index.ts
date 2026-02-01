/**
 * Realtime Module
 *
 * Exports client-side utilities for real-time communication.
 * Server-side code should import directly from @/server/socket.
 */

export { getSocket, disconnectSocket, isConnected, type ConnectionOptions } from './client'
