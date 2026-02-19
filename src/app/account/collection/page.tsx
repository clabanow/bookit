/**
 * Player Collection Page
 *
 * Shows all 28 cards with owned ones in full color and unowned ones grayed out.
 * Includes progress bar, filter tabs by rarity, and card details on tap.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface CollectionCard {
  id: string
  name: string
  description: string
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY' | 'MYSTICAL' | 'IRIDESCENT'
  coinCost: number
  imageUrl: string | null
  season: string | null
  owned: boolean
  obtainedAt: string | null
}

/** Extract emoji from imageUrl format "emoji:🐱" */
function getCardEmoji(imageUrl: string | null): string {
  if (imageUrl && imageUrl.startsWith('emoji:')) {
    return imageUrl.slice(6)
  }
  return '?'
}

interface CollectionStats {
  totalCards: number
  ownedCount: number
  completionPercent: number
}

interface PlayerInfo {
  id: string
  nickname: string
  coins: number
}

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

type RarityFilter = 'ALL' | 'COMMON' | 'RARE' | 'LEGENDARY' | 'MYSTICAL' | 'IRIDESCENT'

export default function CollectionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const playerId = searchParams.get('playerId')

  const [player, setPlayer] = useState<PlayerInfo | null>(null)
  const [cards, setCards] = useState<CollectionCard[]>([])
  const [stats, setStats] = useState<CollectionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<RarityFilter>('ALL')
  const [selectedCard, setSelectedCard] = useState<CollectionCard | null>(null)

  const fetchCollection = useCallback(async () => {
    if (!playerId) return
    try {
      const res = await fetch(`/api/players/${playerId}/collection`)
      if (res.status === 401) {
        router.push('/login')
        return
      }
      if (!res.ok) throw new Error('Failed to load collection')
      const data = await res.json()
      setPlayer(data.player)
      setCards(data.collection)
      setStats(data.stats)
    } catch {
      setError('Failed to load collection')
    } finally {
      setLoading(false)
    }
  }, [playerId, router])

  useEffect(() => {
    fetchCollection()
  }, [fetchCollection])

  if (!playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Select a player to view their collection</p>
          <Button onClick={() => router.push('/account/players')}>Go to Players</Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <p className="text-slate-400">Loading collection...</p>
      </div>
    )
  }

  const filteredCards = filter === 'ALL' ? cards : cards.filter((c) => c.rarity === filter)
  const rarityTabs: RarityFilter[] = ['ALL', 'COMMON', 'RARE', 'LEGENDARY', 'MYSTICAL', 'IRIDESCENT']

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {player?.nickname}&apos;s Collection
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-3 py-1.5">
              <span className="text-yellow-400 font-bold text-lg">{player?.coins ?? 0}</span>
              <span className="text-yellow-500/70 text-sm ml-1">coins</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/shop?playerId=${playerId}`)}
            >
              Shop
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/account/players')}>
              Back
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        {stats && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-400">
                {stats.ownedCount} / {stats.totalCards} cards collected
              </span>
              <span className="text-white font-bold">{stats.completionPercent}%</span>
            </div>
            <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.completionPercent}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        {/* Rarity filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {rarityTabs.map((tab) => {
            const isActive = filter === tab
            const config = tab === 'ALL' ? null : RARITY_CONFIG[tab]
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-slate-900'
                    : `bg-slate-800 ${config?.color ?? 'text-slate-300'} hover:bg-slate-700`
                }`}
              >
                {tab === 'ALL' ? 'All' : config?.label ?? tab}
              </button>
            )
          })}
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {filteredCards.map((card) => {
            const config = RARITY_CONFIG[card.rarity]
            return (
              <button
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className={`rounded-lg border p-2 text-left transition-transform hover:scale-105 ${
                  card.owned
                    ? `${config.bg} ${config.border} ${config.glow}`
                    : 'bg-slate-800/50 border-slate-700 opacity-40 grayscale'
                }`}
              >
                {/* Card art */}
                <div className="w-full aspect-square rounded-md bg-slate-700/50 mb-1.5 flex items-center justify-center text-3xl">
                  {card.owned ? getCardEmoji(card.imageUrl) : '?'}
                </div>
                <p className="text-white text-xs font-medium truncate">{card.name}</p>
                <p className={`text-xs ${config.color}`}>{config.label}</p>
              </button>
            )
          })}
        </div>

        {/* Card detail modal */}
        {selectedCard && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedCard(null)}
          >
            <div
              className={`rounded-xl border p-6 max-w-sm w-full ${
                RARITY_CONFIG[selectedCard.rarity].bg
              } ${RARITY_CONFIG[selectedCard.rarity].border} ${
                RARITY_CONFIG[selectedCard.rarity].glow
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Card art */}
              <div className="w-full aspect-square rounded-lg bg-slate-700/50 mb-4 flex items-center justify-center text-7xl">
                {selectedCard.owned ? getCardEmoji(selectedCard.imageUrl) : '?'}
              </div>

              <h3 className="text-white text-xl font-bold">{selectedCard.name}</h3>
              <p className={`text-sm font-medium ${RARITY_CONFIG[selectedCard.rarity].color}`}>
                {RARITY_CONFIG[selectedCard.rarity].label}
              </p>
              <p className="text-slate-400 text-sm mt-2">{selectedCard.description}</p>

              {selectedCard.season && (
                <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
                  {SEASON_LABELS[selectedCard.season] ?? selectedCard.season}
                </span>
              )}

              <div className="mt-3 text-sm">
                {selectedCard.owned ? (
                  <p className="text-green-400">
                    Owned
                    {selectedCard.obtainedAt &&
                      ` — ${new Date(selectedCard.obtainedAt).toLocaleDateString()}`}
                  </p>
                ) : (
                  <p className="text-slate-500">
                    Not owned — {selectedCard.coinCost} coins in shop
                  </p>
                )}
              </div>

              <Button
                className="w-full mt-4"
                variant="outline"
                onClick={() => setSelectedCard(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
