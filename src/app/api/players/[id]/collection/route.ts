/**
 * Player Collection API
 *
 * GET /api/players/[id]/collection — Get a player's owned cards + stats
 *
 * Returns all 28 cards with ownership status so the UI can show
 * owned cards in full color and unowned cards grayed out.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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
      select: { id: true, nickname: true, coins: true },
    })
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Get ALL cards in the catalog
    const allCards = await prisma.card.findMany({
      orderBy: [{ rarity: 'asc' }, { coinCost: 'asc' }, { name: 'asc' }],
    })

    // Get this player's owned cards
    const ownedCards = await prisma.playerCard.findMany({
      where: { playerId },
      select: { cardId: true, obtainedAt: true },
    })
    const ownedMap = new Map(ownedCards.map((pc) => [pc.cardId, pc.obtainedAt]))

    // Build collection with ownership status
    const collection = allCards.map((card) => ({
      id: card.id,
      name: card.name,
      description: card.description,
      rarity: card.rarity,
      coinCost: card.coinCost,
      season: card.season,
      owned: ownedMap.has(card.id),
      obtainedAt: ownedMap.get(card.id)?.toISOString() ?? null,
    }))

    const totalCards = allCards.length
    const ownedCount = ownedCards.length

    return NextResponse.json({
      player: {
        id: player.id,
        nickname: player.nickname,
        coins: player.coins,
      },
      collection,
      stats: {
        totalCards,
        ownedCount,
        completionPercent: totalCards > 0 ? Math.round((ownedCount / totalCards) * 100) : 0,
      },
    })
  } catch (error) {
    console.error('Collection GET error:', error)
    return NextResponse.json({ error: 'Failed to load collection' }, { status: 500 })
  }
}
