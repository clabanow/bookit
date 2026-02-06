/**
 * Chat Event Handlers
 *
 * Handles real-time chat via Socket.IO. Supports two channel types:
 * - "global" — Messages persisted to DB, loaded via REST API on mount
 * - "game:<sessionId>" — Ephemeral messages, socket-only (no DB persistence)
 *
 * Registered for ALL connections (not role-specific) because both
 * hosts and players can participate in chat.
 */

import type { Server, Socket } from 'socket.io'
import { checkRateLimit } from '@/lib/middleware/rateLimit'
import { moderateMessage } from '@/lib/chat/moderation'
import { prisma } from '@/lib/db'

/**
 * Validate that a channel name is safe.
 * Only allow "global" or "game:<sessionId>" format.
 */
function isValidChannel(channel: string): boolean {
  if (channel === 'global') return true
  if (/^game:[a-z0-9-]+$/i.test(channel)) return true
  return false
}

/**
 * Register chat event handlers for a socket connection.
 *
 * Three events:
 * - chat:join_channel — Subscribe to a channel's messages
 * - chat:leave_channel — Unsubscribe from a channel
 * - chat:send — Send a message to a channel
 */
export function registerChatHandlers(io: Server, socket: Socket): void {
  // Join a chat channel (Socket.IO room)
  socket.on('chat:join_channel', (data: { channel: string }) => {
    const { channel } = data

    if (!channel || !isValidChannel(channel)) {
      socket.emit('error', {
        code: 'INVALID_CHANNEL',
        message: 'Invalid channel name',
      })
      return
    }

    // Socket.IO rooms are the perfect fit here — they let us broadcast
    // a message to everyone "in" a channel without managing our own lists.
    socket.join(`chat:${channel}`)
  })

  // Leave a chat channel
  socket.on('chat:leave_channel', (data: { channel: string }) => {
    const { channel } = data

    if (channel) {
      socket.leave(`chat:${channel}`)
    }
  })

  // Send a chat message
  socket.on(
    'chat:send',
    async (data: {
      channel: string
      content: string
      playerId: string
      userId: string
      nickname: string
    }) => {
      const { channel, content, playerId, userId, nickname } = data

      // Validate channel
      if (!channel || !isValidChannel(channel)) {
        socket.emit('error', {
          code: 'INVALID_CHANNEL',
          message: 'Invalid channel name',
        })
        return
      }

      // Rate limit: 1 message per 2 seconds
      const rateCheck = checkRateLimit(socket.id, 'sendMessage')
      if (!rateCheck.allowed) {
        socket.emit('error', {
          code: 'RATE_LIMITED',
          message: rateCheck.message || 'Too fast! Wait a moment.',
        })
        return
      }

      // Moderate the message
      const modResult = moderateMessage(content)
      if (!modResult.allowed) {
        socket.emit('error', {
          code: 'MODERATION_REJECTED',
          message: modResult.reason || 'Message rejected',
        })
        return
      }

      // Build the message payload to broadcast
      const messagePayload = {
        id: '', // Will be set after DB persist, or random for ephemeral
        playerId,
        nickname,
        content: modResult.sanitized!,
        createdAt: new Date().toISOString(),
        channel,
      }

      // Persist to DB for global channel, skip for game channels (ephemeral)
      if (channel === 'global') {
        try {
          const saved = await prisma.chatMessage.create({
            data: {
              userId,
              playerId,
              channel: 'global',
              content: modResult.sanitized!,
            },
          })
          messagePayload.id = saved.id
        } catch (err) {
          console.error('Failed to persist chat message:', err)
          socket.emit('error', {
            code: 'INTERNAL_ERROR',
            message: 'Failed to send message',
          })
          return
        }
      } else {
        // Generate a temporary ID for ephemeral messages
        messagePayload.id = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      }

      // Broadcast to everyone in the channel room (including sender)
      io.to(`chat:${channel}`).emit('chat:message', messagePayload)
    }
  )
}
