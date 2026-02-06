'use client'

/**
 * ChatPanel — Reusable chat component for global and in-game chat.
 *
 * Two modes:
 * - "full" — Full-page chat with history loaded from REST API (global chat)
 * - "compact" — Smaller panel for in-game overlay (ephemeral, socket-only)
 *
 * Messages flow in via Socket.IO. For global chat, historical messages
 * are fetched on mount with cursor-based pagination.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { getSocket } from '@/lib/realtime/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ChatMessage {
  id: string
  playerId: string
  nickname: string
  content: string
  createdAt: string
}

interface ChatPanelProps {
  channel: string
  playerId: string
  userId: string
  playerNickname: string
  mode: 'full' | 'compact'
}

export function ChatPanel({ channel, playerId, userId, playerNickname, mode }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load history for global channel only
  useEffect(() => {
    if (channel !== 'global') return

    async function loadHistory() {
      try {
        const res = await fetch('/api/chat?limit=50')
        if (!res.ok) return

        const data = await res.json()
        // API returns newest first, we want oldest first for display
        setMessages(data.messages.reverse())
      } catch {
        // Silently fail — chat history is nice-to-have, not critical
      }
    }

    loadHistory()
  }, [channel])

  // Join channel + listen for messages via Socket.IO
  useEffect(() => {
    const socket = getSocket({ role: 'player' })

    // Join the channel room
    socket.emit('chat:join_channel', { channel })

    // Listen for new messages
    const handleMessage = (data: ChatMessage & { channel: string }) => {
      if (data.channel === channel) {
        setMessages((prev) => [...prev, data])
      }
    }

    socket.on('chat:message', handleMessage)

    // Listen for errors (e.g., rate limiting, moderation rejection)
    const handleError = (data: { code: string; message: string }) => {
      if (
        data.code === 'RATE_LIMITED' ||
        data.code === 'MODERATION_REJECTED'
      ) {
        setError(data.message)
        setTimeout(() => setError(null), 3000)
      }
    }

    socket.on('error', handleError)

    return () => {
      socket.emit('chat:leave_channel', { channel })
      socket.off('chat:message', handleMessage)
      socket.off('error', handleError)
    }
  }, [channel])

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  function handleSend() {
    if (!input.trim() || sending) return
    if (input.length > 200) {
      setError('Message must be 200 characters or less')
      setTimeout(() => setError(null), 3000)
      return
    }

    setSending(true)
    setError(null)

    const socket = getSocket({ role: 'player' })
    socket.emit('chat:send', {
      channel,
      content: input.trim(),
      playerId,
      userId,
      nickname: playerNickname,
    })

    setInput('')
    // Brief cooldown to match rate limit
    setTimeout(() => setSending(false), 2000)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isCompact = mode === 'compact'

  return (
    <div
      className={`flex flex-col ${
        isCompact ? 'h-80' : 'h-[calc(100vh-12rem)]'
      } bg-slate-900 rounded-lg border border-slate-700`}
    >
      {/* Messages area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
      >
        {messages.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">
            No messages yet. Say hello!
          </p>
        )}

        {messages.map((msg) => {
          const isOwn = msg.playerId === playerId

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm ${
                  isOwn
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                {!isOwn && (
                  <span className="font-bold text-xs text-blue-400 block">
                    {msg.nickname}
                  </span>
                )}
                <span className="break-words">{msg.content}</span>
              </div>
              <span className="text-[10px] text-slate-600 mt-0.5 px-1">
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs text-center border-t border-red-500/20">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="p-2 border-t border-slate-700 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={200}
          disabled={sending}
          className="bg-slate-800 border-slate-600 text-white text-sm"
        />
        <Button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          size="sm"
          className="shrink-0"
        >
          Send
        </Button>
      </div>
    </div>
  )
}
