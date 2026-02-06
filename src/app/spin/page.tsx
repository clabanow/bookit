'use client'

/**
 * Daily Spin Page
 *
 * Players can spin the wheel once per day to earn bonus coins.
 * Uses the same ?playerId= pattern as /shop and /collection.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SpinWheel } from '@/components/rewards/SpinWheel'

interface Prize {
  coins: number
  label: string
  color: string
}

export default function SpinPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const playerId = searchParams.get('playerId')

  const [canSpin, setCanSpin] = useState(false)
  const [coins, setCoins] = useState(0)
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStatus = useCallback(async () => {
    if (!playerId) return
    try {
      const res = await fetch(`/api/spin?playerId=${playerId}`)
      if (res.status === 401) {
        router.push('/login?redirect=/spin')
        return
      }
      if (!res.ok) throw new Error('Failed to load spin status')
      const data = await res.json()
      setCanSpin(data.canSpin)
      setCoins(data.playerCoins)
      setPrizes(data.prizes)
    } catch {
      setError('Failed to load spin wheel')
    } finally {
      setLoading(false)
    }
  }, [playerId, router])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  async function handleSpin(): Promise<{
    prizeIndex: number
    prizeCoins: number
    newBalance: number
  } | null> {
    try {
      const res = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })

      if (res.status === 429) {
        setCanSpin(false)
        setError('You already spun today! Come back tomorrow.')
        return null
      }

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Spin failed')
        return null
      }

      const data = await res.json()

      // Update local state after spin
      setCoins(data.newBalance)
      setCanSpin(false)

      return data
    } catch {
      setError('Network error')
      return null
    }
  }

  if (!playerId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
        <p className="text-slate-400 mb-4">No player selected.</p>
        <Button onClick={() => router.push('/account/players')}>
          Select Player
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <p className="text-slate-400">Loading spin wheel...</p>
      </div>
    )
  }

  if (error && prizes.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
        <p className="text-red-400 mb-4">{error}</p>
        <Button variant="outline" onClick={() => router.push('/account/players')}>
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Daily Spin</h1>
            <p className="text-yellow-400 font-medium">{coins} coins</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/account/players')}>
            Back
          </Button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-md text-sm text-center">
            {error}
          </div>
        )}

        {/* Spin wheel */}
        <div className="flex justify-center">
          <SpinWheel prizes={prizes} canSpin={canSpin} onSpin={handleSpin} />
        </div>
      </div>
    </div>
  )
}
