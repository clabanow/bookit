/**
 * Daily Spin Wheel API
 *
 * GET  /api/spin?playerId=X  — Check if player can spin + get prizes list
 * POST /api/spin              — Perform the spin (server-authoritative)
 *
 * The prize is selected server-side to prevent cheating. The client
 * receives the prize index and animates the wheel to land on it.
 *
 * One spin per UTC day per player, enforced by lastSpinDate.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { SPIN_PRIZES, spinWheel, canSpinToday } from '@/lib/rewards/spinWheel'

export const dynamic = 'force-dynamic'

/**
 * Check spin status: can the player spin today?
 * Also returns the prize list so the client can render the wheel.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const playerId = request.nextUrl.searchParams.get('playerId')
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

    return NextResponse.json({
      canSpin: canSpinToday(player.lastSpinDate),
      playerCoins: player.coins,
      prizes: SPIN_PRIZES.map((p) => ({
        coins: p.coins,
        label: p.label,
        color: p.color,
      })),
    })
  } catch (error) {
    console.error('Spin GET error:', error)
    return NextResponse.json({ error: 'Failed to check spin status' }, { status: 500 })
  }
}

/**
 * Perform a spin. Server picks the prize (weighted random),
 * updates the player's coins and lastSpinDate in one DB call.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { playerId } = body as { playerId?: string }

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

    // Enforce one-spin-per-day
    if (!canSpinToday(player.lastSpinDate)) {
      return NextResponse.json(
        { error: 'You already spun today! Come back tomorrow.' },
        { status: 429 }
      )
    }

    // Server-authoritative prize selection
    const { prize, index } = spinWheel()

    // Update coins and lastSpinDate in a single DB call
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        coins: { increment: prize.coins },
        lastSpinDate: new Date(),
      },
      select: { coins: true },
    })

    return NextResponse.json({
      prizeIndex: index,
      prizeCoins: prize.coins,
      newBalance: updatedPlayer.coins,
    })
  } catch (error) {
    console.error('Spin POST error:', error)
    return NextResponse.json({ error: 'Failed to spin' }, { status: 500 })
  }
}
