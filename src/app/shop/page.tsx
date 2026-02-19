/**
 * Card Shop Page
 *
 * Players browse and buy trading cards with their gold coins.
 * Cards are grouped by rarity tier, with seasonal cards only
 * showing during their month.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface ShopCard {
  id: string
  name: string
  description: string
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY' | 'MYSTICAL' | 'IRIDESCENT'
  coinCost: number
  imageUrl: string | null
  season: string | null
  owned: boolean
}

/** Extract emoji from imageUrl format "emoji:🐱" */
function getCardEmoji(imageUrl: string | null): string {
  if (imageUrl && imageUrl.startsWith('emoji:')) {
    return imageUrl.slice(6)
  }
  return '?'
}

/** Visual config for each rarity tier */
const RARITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; glow: string }
> = {
  COMMON: {
    label: 'Common',
    color: 'text-gray-300',
    bg: 'bg-gray-800',
    border: 'border-gray-600',
    glow: '',
  },
  RARE: {
    label: 'Rare',
    color: 'text-blue-400',
    bg: 'bg-blue-950',
    border: 'border-blue-500',
    glow: '',
  },
  LEGENDARY: {
    label: 'Legendary',
    color: 'text-purple-400',
    bg: 'bg-purple-950',
    border: 'border-purple-500',
    glow: 'shadow-purple-500/20 shadow-lg',
  },
  MYSTICAL: {
    label: 'Mystical',
    color: 'text-pink-400',
    bg: 'bg-pink-950',
    border: 'border-pink-500',
    glow: 'shadow-pink-500/30 shadow-lg',
  },
  IRIDESCENT: {
    label: 'Iridescent',
    color: 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400',
    bg: 'bg-gradient-to-br from-yellow-950 via-pink-950 to-cyan-950',
    border: 'border-yellow-400',
    glow: 'shadow-yellow-400/30 shadow-xl',
  },
}

const SEASON_LABELS: Record<string, string> = {
  OCT: 'Halloween',
  NOV: 'Thanksgiving',
  DEC: 'Christmas',
}

export default function ShopPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const playerId = searchParams.get('playerId')

  const [cards, setCards] = useState<ShopCard[]>([])
  const [coins, setCoins] = useState(0)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchShop = useCallback(async () => {
    if (!playerId) return
    try {
      const res = await fetch(`/api/shop?playerId=${playerId}`)
      if (res.status === 401) {
        router.push('/login')
        return
      }
      if (!res.ok) throw new Error('Failed to load shop')
      const data = await res.json()
      setCards(data.cards)
      setCoins(data.playerCoins)
    } catch {
      setError('Failed to load shop')
    } finally {
      setLoading(false)
    }
  }, [playerId, router])

  useEffect(() => {
    fetchShop()
  }, [fetchShop])

  async function handleBuy(card: ShopCard) {
    if (buying) return
    setError('')
    setSuccess('')
    setBuying(card.id)

    try {
      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, cardId: card.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to buy card')
        return
      }
      setSuccess(`You got ${card.name}!`)
      setCoins(data.remainingCoins)
      // Mark card as owned
      setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, owned: true } : c)))
    } catch {
      setError('Network error')
    } finally {
      setBuying(null)
    }
  }

  if (!playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Select a player to visit the shop</p>
          <Button onClick={() => router.push('/account/players')}>Go to Players</Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <p className="text-slate-400">Loading shop...</p>
      </div>
    )
  }

  // Group cards by rarity
  const tiers = ['COMMON', 'RARE', 'LEGENDARY', 'MYSTICAL', 'IRIDESCENT'] as const
  const groupedCards = tiers.map((rarity) => ({
    rarity,
    config: RARITY_CONFIG[rarity],
    cards: cards.filter((c) => c.rarity === rarity),
  }))

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Card Shop</h1>
            <p className="text-slate-400 text-sm">Collect all 28 trading cards!</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-3 py-1.5">
              <span className="text-yellow-400 font-bold text-lg">{coins}</span>
              <span className="text-yellow-500/70 text-sm ml-1">coins</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/account/collection?playerId=${playerId}`)}
            >
              My Collection
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/account/players')}>
              Back
            </Button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 text-green-400 border border-green-500/20 p-3 rounded-md text-sm mb-4">
            {success}
          </div>
        )}

        {/* Card tiers */}
        <div className="space-y-8">
          {groupedCards.map(({ rarity, config, cards: tierCards }) => {
            if (tierCards.length === 0) return null

            return (
              <section key={rarity}>
                <h2 className={`text-lg font-bold mb-3 ${config.color}`}>
                  {config.label}
                  <span className="text-slate-500 font-normal text-sm ml-2">
                    ({tierCards.filter((c) => c.owned).length}/{tierCards.length})
                  </span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {tierCards.map((card) => (
                    <div
                      key={card.id}
                      className={`rounded-lg border p-3 ${config.bg} ${config.border} ${config.glow} ${
                        card.owned ? 'opacity-70' : ''
                      }`}
                    >
                      {/* Card art */}
                      <div className="w-full aspect-square rounded-md bg-slate-700/50 mb-2 flex items-center justify-center text-5xl">
                        {card.owned ? (
                          getCardEmoji(card.imageUrl)
                        ) : (
                          <span className="opacity-30 text-3xl">?</span>
                        )}
                      </div>

                      {/* Card info */}
                      <h3 className="text-white font-medium text-sm truncate">{card.name}</h3>
                      <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">
                        {card.description}
                      </p>

                      {/* Season badge */}
                      {card.season && (
                        <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                          {SEASON_LABELS[card.season] ?? card.season}
                        </span>
                      )}

                      {/* Price / owned status */}
                      <div className="mt-2">
                        {card.owned ? (
                          <span className="text-green-400 text-xs font-medium">Owned</span>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full text-xs h-7"
                            disabled={coins < card.coinCost || buying === card.id}
                            onClick={() => handleBuy(card)}
                          >
                            {buying === card.id
                              ? 'Buying...'
                              : `${card.coinCost} coins`}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
