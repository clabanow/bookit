/**
 * Player Detail API
 *
 * POST /api/players/[id] - Verify PIN and "select" this player
 * DELETE /api/players/[id] - Delete a player sub-account
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession, verifyPassword } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Verify PIN to select a player
 * Returns the player info if PIN is correct
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { pin } = body as { pin?: string }

    if (!pin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 })
    }

    // Find player belonging to this user
    const player = await prisma.player.findFirst({
      where: {
        id,
        userId: session.userId,
      },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        pinHash: true,
      },
    })

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Verify PIN
    const isValid = await verifyPassword(pin, player.pinHash)
    if (!isValid) {
      return NextResponse.json({ error: 'Wrong PIN! Try again.' }, { status: 401 })
    }

    // Return player info (without pinHash)
    return NextResponse.json({
      success: true,
      player: {
        id: player.id,
        nickname: player.nickname,
        avatar: player.avatar,
      },
    })
  } catch (error) {
    console.error('Verify PIN error:', error)
    return NextResponse.json({ error: 'Failed to verify PIN' }, { status: 500 })
  }
}

/**
 * Delete a player sub-account
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params

    // Verify player belongs to user
    const player = await prisma.player.findFirst({
      where: {
        id,
        userId: session.userId,
      },
    })

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Delete player
    await prisma.player.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Player deleted' })
  } catch (error) {
    console.error('Delete player error:', error)
    return NextResponse.json({ error: 'Failed to delete player' }, { status: 500 })
  }
}
