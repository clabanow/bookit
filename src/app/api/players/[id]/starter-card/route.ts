/**
 * Starter Card API
 *
 * GET  /api/players/[id]/starter-card — List available Common cards to pick from
 * POST /api/players/[id]/starter-card — Claim a free Common card (only if player has 0 cards)
 *
 * Every player gets to pick one free Common card as their starter.
 * This endpoint enforces: the player must have zero cards, and the
 * chosen card must be COMMON rarity.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * List Common cards available as starters.
 * Returns card ID, name, description, and imageUrl for each.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id: playerId } = await params

    // Verify the player belongs to this user
    const player = await prisma.player.findFirst({
      where: { id: playerId, userId: session.userId },
      select: { id: true },
    })
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Get all Common cards
    const commonCards = await prisma.card.findMany({
      where: { rarity: 'COMMON' },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ cards: commonCards })
  } catch (error) {
    console.error('Starter card GET error:', error)
    return NextResponse.json({ error: 'Failed to load starter cards' }, { status: 500 })
  }
}

/**
 * Claim a free Common card as a starter.
 * Only works if the player has zero cards.
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

    const { id: playerId } = await params
    const body = await request.json()
    const { cardId } = body as { cardId?: string }

    if (!cardId) {
      return NextResponse.json({ error: 'cardId is required' }, { status: 400 })
    }

    // Verify the player belongs to this user
    const player = await prisma.player.findFirst({
      where: { id: playerId, userId: session.userId },
      select: { id: true },
    })
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Check that the player has zero cards
    const cardCount = await prisma.playerCard.count({
      where: { playerId },
    })
    if (cardCount > 0) {
      return NextResponse.json(
        { error: 'You already have cards — starter card is for new players only' },
        { status: 400 }
      )
    }

    // Verify the card exists and is Common rarity
    const card = await prisma.card.findUnique({
      where: { id: cardId },
    })
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }
    if (card.rarity !== 'COMMON') {
      return NextResponse.json(
        { error: 'Starter card must be Common rarity' },
        { status: 400 }
      )
    }

    // Grant the card for free
    await prisma.playerCard.create({
      data: { playerId, cardId },
    })

    return NextResponse.json({
      message: `You chose ${card.name} as your starter card!`,
      card: {
        id: card.id,
        name: card.name,
        imageUrl: card.imageUrl,
      },
    })
  } catch (error) {
    console.error('Starter card POST error:', error)
    return NextResponse.json({ error: 'Failed to claim starter card' }, { status: 500 })
  }
}
