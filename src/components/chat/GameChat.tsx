'use client'

/**
 * GameChat — Floating in-game chat overlay.
 *
 * A toggle button in the bottom-right corner that expands to show
 * a compact ChatPanel. Messages are ephemeral (socket-only, not persisted).
 *
 * Shows an unread count badge when collapsed to let players know
 * they have new messages.
 */

import { useState, useEffect } from 'react'
import { getSocket } from '@/lib/realtime/client'
import { ChatPanel } from './ChatPanel'

interface GameChatProps {
  sessionId: string
  playerId: string
  userId: string
  playerNickname: string
}

export function GameChat({ sessionId, playerId, userId, playerNickname }: GameChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const channel = `game:${sessionId}`

  // Track unread messages when chat is collapsed
  useEffect(() => {
    const socket = getSocket({ role: 'player' })

    const handleMessage = (data: {
      id: string
      playerId: string
      nickname: string
      content: string
      createdAt: string
      channel: string
    }) => {
      if (data.channel === channel && !isOpen) {
        setUnreadCount((prev) => prev + 1)
      }
    }

    socket.on('chat:message', handleMessage)

    return () => {
      socket.off('chat:message', handleMessage)
    }
  }, [channel, isOpen])

  // Clear unread count when opening
  function handleToggle() {
    setIsOpen((prev) => {
      if (!prev) setUnreadCount(0)
      return !prev
    })
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat panel (expanded) */}
      {isOpen && (
        <div className="mb-2 w-80">
          <ChatPanel
            channel={channel}
            playerId={playerId}
            userId={userId}
            playerNickname={playerNickname}
            mode="compact"
          />
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg flex items-center justify-center transition-colors relative"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          // X icon
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        ) : (
          // Chat bubble icon
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>
        )}

        {/* Unread badge */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}
