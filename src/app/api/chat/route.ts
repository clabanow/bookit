/**
 * Chat API — Global Chat Messages
 *
 * GET  /api/chat?cursor=<id>&limit=50  — Paginated global messages (newest first)
 * POST /api/chat                        — Send a new message
 *
 * Cursor-based pagination: pass the `id` of the last message you received
 * to get older messages. This is more reliable than offset-based pagination
 * when new messages are being added in real-time.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { moderateMessage } from '@/lib/chat/moderation'

export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

/**
 * Fetch global chat messages with cursor-based pagination.
 * Returns newest messages first so the client can display them bottom-up.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const cursor = request.nextUrl.searchParams.get('cursor')
    const limitParam = request.nextUrl.searchParams.get('limit')
    const limit = Math.min(
      Math.max(1, parseInt(limitParam || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
      MAX_LIMIT
    )

    const messages = await prisma.chatMessage.findMany({
      where: { channel: 'global' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1, // Skip the cursor item itself
          }
        : {}),
      include: {
        player: {
          select: { nickname: true },
        },
      },
    })

    // Next cursor is the last message in this batch (oldest in this page)
    const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        playerId: m.playerId,
        nickname: m.player.nickname,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
      nextCursor,
    })
  } catch (error) {
    console.error('Chat GET error:', error)
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }
}

/**
 * Send a new global chat message.
 * Runs through moderation (length, XSS, profanity) before persisting.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { playerId, content } = body as { playerId?: string; content?: string }

    if (!playerId) {
      return NextResponse.json({ error: 'playerId is required' }, { status: 400 })
    }

    // Verify the player belongs to this user
    const player = await prisma.player.findFirst({
      where: { id: playerId, userId: session.userId },
    })
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Moderate the message
    const modResult = moderateMessage(content)
    if (!modResult.allowed) {
      return NextResponse.json({ error: modResult.reason }, { status: 400 })
    }

    // Persist the message
    const message = await prisma.chatMessage.create({
      data: {
        userId: session.userId,
        playerId,
        channel: 'global',
        content: modResult.sanitized!,
      },
      include: {
        player: {
          select: { nickname: true },
        },
      },
    })

    return NextResponse.json({
      message: {
        id: message.id,
        playerId: message.playerId,
        nickname: message.player.nickname,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Chat POST error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
