'use client'

/**
 * SpinWheel — Animated prize wheel component.
 *
 * Uses CSS conic-gradient to draw colored segments and CSS transform
 * with a cubic-bezier transition for the spin animation.
 *
 * How the animation works:
 * 1. User clicks "Spin" → API picks prize server-side
 * 2. We calculate the target rotation angle for that prize segment
 * 3. We add extra full rotations (for dramatic effect) and set the CSS transform
 * 4. The CSS transition handles the easing animation (fast start, slow end)
 * 5. After the transition completes, we show the prize result
 */

import { useState, useCallback } from 'react'

interface Prize {
  coins: number
  label: string
  color: string
}

interface SpinWheelProps {
  prizes: Prize[]
  canSpin: boolean
  onSpin: () => Promise<{ prizeIndex: number; prizeCoins: number; newBalance: number } | null>
}

/** Map Tailwind bg classes to hex colors for conic-gradient */
function prizeToHex(color: string): string {
  const map: Record<string, string> = {
    'bg-slate-600': '#475569',
    'bg-blue-600': '#2563eb',
    'bg-green-600': '#16a34a',
    'bg-purple-600': '#9333ea',
    'bg-pink-600': '#db2777',
    'bg-orange-600': '#ea580c',
    'bg-yellow-500': '#eab308',
  }
  return map[color] || '#6b7280'
}

export function SpinWheel({ prizes, canSpin, onSpin }: SpinWheelProps) {
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<{ coins: number; newBalance: number } | null>(null)

  // Build conic-gradient string from prizes
  const segmentAngle = 360 / prizes.length
  const gradientStops = prizes
    .map((p, i) => {
      const start = i * segmentAngle
      const end = (i + 1) * segmentAngle
      return `${prizeToHex(p.color)} ${start}deg ${end}deg`
    })
    .join(', ')

  const handleSpin = useCallback(async () => {
    if (spinning || !canSpin) return

    setSpinning(true)
    setResult(null)

    const spinResult = await onSpin()
    if (!spinResult) {
      setSpinning(false)
      return
    }

    // Calculate target angle:
    // - Each segment spans segmentAngle degrees
    // - We want to land in the CENTER of the winning segment
    // - Add extra full rotations for dramatic spin effect
    // - The pointer is at the TOP (12 o'clock), so segment 0 starts at 0deg
    const targetSegmentCenter = spinResult.prizeIndex * segmentAngle + segmentAngle / 2
    // We spin clockwise, so we need to go TO the prize.
    // The wheel rotates, and the pointer stays fixed at top.
    // To land on segment N, rotate so that segment's center aligns with top.
    const extraRotations = 5 * 360 // 5 full spins for drama
    const targetRotation = rotation + extraRotations + (360 - targetSegmentCenter)

    setRotation(targetRotation)

    // Show result after animation completes (4 seconds)
    setTimeout(() => {
      setResult({
        coins: spinResult.prizeCoins,
        newBalance: spinResult.newBalance,
      })
      setSpinning(false)
    }, 4200)
  }, [spinning, canSpin, onSpin, rotation, segmentAngle])

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Wheel container */}
      <div className="relative">
        {/* Pointer triangle at top */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-white drop-shadow-lg" />

        {/* The wheel */}
        <div
          className="w-64 h-64 md:w-80 md:h-80 rounded-full border-4 border-white/20 shadow-2xl relative overflow-hidden"
          style={{
            background: `conic-gradient(${gradientStops})`,
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
              : 'none',
          }}
        >
          {/* Prize labels on the wheel */}
          {prizes.map((prize, i) => {
            const angle = i * segmentAngle + segmentAngle / 2
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 origin-center"
                style={{
                  transform: `rotate(${angle}deg) translateY(-45%) translateX(-50%)`,
                  width: '1px',
                  height: '1px',
                }}
              >
                <span
                  className="text-white font-bold text-xs md:text-sm drop-shadow-md whitespace-nowrap"
                  style={{
                    display: 'block',
                    transform: `translateX(-50%) translateY(-30px)`,
                  }}
                >
                  {prize.label}
                </span>
              </div>
            )
          })}

          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-900 border-2 border-white/30 shadow-inner" />
        </div>
      </div>

      {/* Spin button */}
      <button
        onClick={handleSpin}
        disabled={spinning || !canSpin}
        className={`px-8 py-3 rounded-full text-lg font-bold transition-all shadow-lg ${
          canSpin && !spinning
            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 hover:from-yellow-300 hover:to-orange-400 animate-pulse hover:animate-none'
            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
        }`}
      >
        {spinning ? 'Spinning...' : canSpin ? 'SPIN!' : 'Come back tomorrow!'}
      </button>

      {/* Prize result */}
      {result && (
        <div className="text-center animate-bounce">
          <p className="text-3xl md:text-4xl font-bold text-yellow-400">
            +{result.coins} coins!
          </p>
          <p className="text-slate-400 mt-1">
            New balance: {result.newBalance} coins
          </p>
        </div>
      )}
    </div>
  )
}
