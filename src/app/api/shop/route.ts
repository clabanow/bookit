/**
 * Card Shop API
 *
 * GET  /api/shop?playerId=X  — List cards available this month, with ownership status
 * POST /api/shop              — Buy a card (body: { playerId, cardId })
 *
 * Cards can be seasonal: they only appear in the shop during their month.
 * Season values: "OCT" (October), "NOV" (November), "DEC" (December), or null (always available).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** Map month numbers to season codes */
const MONTH_TO_SEASON: Record<number, string> = {
  10: 'OCT',
  11: 'NOV',
  12: 'DEC',
}

/**
 * List all cards in the shop.
 * Seasonal cards only show during their month.
 * Each card includes whether the given player already owns it.
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

    // Determine which seasons are active this month
    const currentMonth = new Date().getMonth() + 1 // 1-12
    const currentSeason = MONTH_TO_SEASON[currentMonth] ?? null

    // Fetch all cards, then filter by season on the server
    const allCards = await prisma.card.findMany({
      orderBy: [{ rarity: 'asc' }, { coinCost: 'asc' }, { name: 'asc' }],
    })

    // Filter: show cards that are always available OR match current season
    const availableCards = allCards.filter(
      (card) => card.season === null || card.season === currentSeason
    )

    // Get this player's owned card IDs
    const ownedCards = await prisma.playerCard.findMany({
      where: { playerId },
      select: { cardId: true },
    })
    const ownedCardIds = new Set(ownedCards.map((pc) => pc.cardId))

    const shopCards = availableCards.map((card) => ({
      id: card.id,
      name: card.name,
      description: card.description,
      rarity: card.rarity,
      coinCost: card.coinCost,
      season: card.season,
      owned: ownedCardIds.has(card.id),
    }))

    return NextResponse.json({
      cards: shopCards,
      playerCoins: player.coins,
      currentSeason,
    })
  } catch (error) {
    console.error('Shop GET error:', error)
    return NextResponse.json({ error: 'Failed to load shop' }, { status: 500 })
  }
}

/**
 * Buy a card from the shop.
 * Validates: enough coins, not already owned, card is in season.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { playerId, cardId } = body as { playerId?: string; cardId?: string }

    if (!playerId || !cardId) {
      return NextResponse.json({ error: 'playerId and cardId are required' }, { status: 400 })
    }

    // Verify the player belongs to this user
    const player = await prisma.player.findFirst({
      where: { id: playerId, userId: session.userId },
    })
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Fetch the card
    const card = await prisma.card.findUnique({ where: { id: cardId } })
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    // Check if card is in season
    if (card.season !== null) {
      const currentMonth = new Date().getMonth() + 1
      const currentSeason = MONTH_TO_SEASON[currentMonth] ?? null
      if (card.season !== currentSeason) {
        return NextResponse.json(
          { error: 'This card is not available this month' },
          { status: 400 }
        )
      }
    }

    // Check if already owned
    const existingOwnership = await prisma.playerCard.findUnique({
      where: { playerId_cardId: { playerId, cardId } },
    })
    if (existingOwnership) {
      return NextResponse.json({ error: 'You already own this card' }, { status: 400 })
    }

    // Check if player has enough coins
    if (player.coins < card.coinCost) {
      return NextResponse.json(
        { error: `Not enough coins. Need ${card.coinCost}, have ${player.coins}` },
        { status: 400 }
      )
    }

    // Execute purchase in a transaction (deduct coins + create ownership)
    const [updatedPlayer] = await prisma.$transaction([
      prisma.player.update({
        where: { id: playerId },
        data: { coins: { decrement: card.coinCost } },
        select: { coins: true },
      }),
      prisma.playerCard.create({
        data: { playerId, cardId },
      }),
    ])

    return NextResponse.json({
      message: `You bought ${card.name}!`,
      remainingCoins: updatedPlayer.coins,
      card: {
        id: card.id,
        name: card.name,
        rarity: card.rarity,
      },
    })
  } catch (error) {
    console.error('Shop POST error:', error)
    return NextResponse.json({ error: 'Failed to buy card' }, { status: 500 })
  }
}
