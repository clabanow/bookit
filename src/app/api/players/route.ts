/**
 * Players API
 *
 * GET /api/players - List user's player sub-accounts
 * POST /api/players - Create a new player (max 3 per user)
 *
 * Each user can have up to 3 "player" identities they can use in games.
 * This allows families to share an account while each person has their own nickname.
 * Each player has a secret 4-digit PIN to prevent siblings from using the wrong account!
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, hashPassword } from '@/lib/auth'
import { validateNickname, sanitizeNickname } from '@/lib/validation/nickname'

export const dynamic = 'force-dynamic'

// Maximum players per user
const MAX_PLAYERS = 3

// PIN must be exactly 4 digits
const PIN_REGEX = /^\d{4}$/

/**
 * List all players for the current user
 * (PIN is never returned - that's a secret!)
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (session.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Account not approved' }, { status: 403 })
    }

    const players = await prisma.player.findMany({
      where: { userId: session.userId },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        createdAt: true,
        // Never return pinHash!
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      players: players.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      })),
      maxPlayers: MAX_PLAYERS,
      canCreateMore: players.length < MAX_PLAYERS,
    })
  } catch (error) {
    console.error('List players error:', error)
    return NextResponse.json({ error: 'Failed to list players' }, { status: 500 })
  }
}

/**
 * Create a new player sub-account
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (session.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Account not approved' }, { status: 403 })
    }

    const body = await request.json()
    const { nickname, pin, avatar } = body as { nickname?: string; pin?: string; avatar?: string }

    // Validate nickname
    if (!nickname) {
      return NextResponse.json({ error: 'Nickname is required' }, { status: 400 })
    }

    const validation = validateNickname(nickname)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Validate PIN
    if (!pin) {
      return NextResponse.json({ error: 'Secret PIN is required' }, { status: 400 })
    }

    if (!PIN_REGEX.test(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
    }

    const cleanNickname = sanitizeNickname(nickname)

    // Check player limit
    const existingCount = await prisma.player.count({
      where: { userId: session.userId },
    })

    if (existingCount >= MAX_PLAYERS) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_PLAYERS} players allowed per account` },
        { status: 400 }
      )
    }

    // Check for duplicate nickname within user's players
    const duplicate = await prisma.player.findFirst({
      where: {
        userId: session.userId,
        nickname: { equals: cleanNickname, mode: 'insensitive' },
      },
    })

    if (duplicate) {
      return NextResponse.json(
        { error: 'You already have a player with this nickname' },
        { status: 400 }
      )
    }

    // Hash the PIN (we use the same bcrypt function as passwords)
    const pinHash = await hashPassword(pin)

    // Create player
    const player = await prisma.player.create({
      data: {
        userId: session.userId,
        nickname: cleanNickname,
        pinHash,
        avatar: avatar || null,
      },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      {
        message: 'Player created',
        player: {
          ...player,
          createdAt: player.createdAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create player error:', error)
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 })
  }
}
