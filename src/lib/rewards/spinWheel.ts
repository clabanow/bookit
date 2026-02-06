/**
 * Spin Wheel Logic
 *
 * Implements a weighted random prize wheel for the daily spin feature.
 *
 * How weighted random works:
 * - Each prize has a "weight" (chance of being selected)
 * - Weights sum to 100 (like percentages)
 * - We generate a random number 0-100 and walk through prizes,
 *   subtracting each weight until we find the matching prize
 *
 * Example: weights [35, 25, 20, 12, 5, 2, 1]
 * - Random 0-35 → 10 coins (35% chance)
 * - Random 35-60 → 25 coins (25% chance)
 * - Random 60-80 → 50 coins (20% chance)
 * - etc.
 */

export interface SpinPrize {
  coins: number
  label: string
  weight: number
  color: string // Tailwind bg class for the wheel segment
}

/**
 * Prize tiers — calibrated so a spin is a nice bonus without
 * overshadowing gameplay (a game earns ~120-150 coins).
 */
export const SPIN_PRIZES: SpinPrize[] = [
  { coins: 10, label: '10', weight: 35, color: 'bg-slate-600' },
  { coins: 25, label: '25', weight: 25, color: 'bg-blue-600' },
  { coins: 50, label: '50', weight: 20, color: 'bg-green-600' },
  { coins: 100, label: '100', weight: 12, color: 'bg-purple-600' },
  { coins: 250, label: '250', weight: 5, color: 'bg-pink-600' },
  { coins: 500, label: '500', weight: 2, color: 'bg-orange-600' },
  { coins: 1000, label: '1000', weight: 1, color: 'bg-yellow-500' },
]

/**
 * Spin the wheel and get a prize.
 *
 * @param randomValue - Optional value 0-1 for deterministic testing.
 *                      If not provided, uses Math.random().
 * @returns The prize and its index in SPIN_PRIZES
 */
export function spinWheel(randomValue?: number): { prize: SpinPrize; index: number } {
  const rand = (randomValue ?? Math.random()) * 100
  let cumulative = 0

  for (let i = 0; i < SPIN_PRIZES.length; i++) {
    cumulative += SPIN_PRIZES[i].weight
    if (rand < cumulative) {
      return { prize: SPIN_PRIZES[i], index: i }
    }
  }

  // Fallback to last prize (should only happen if rand === 100 exactly)
  return { prize: SPIN_PRIZES[SPIN_PRIZES.length - 1], index: SPIN_PRIZES.length - 1 }
}

/**
 * Check if two dates fall on the same UTC day.
 *
 * We use UTC so the spin resets at midnight UTC globally,
 * rather than at different times for different timezones.
 */
export function isSameUTCDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

/**
 * Check if a player can spin today.
 *
 * @param lastSpinDate - The player's last spin date, or null if never spun
 * @returns true if they haven't spun today (UTC)
 */
export function canSpinToday(lastSpinDate: Date | null): boolean {
  if (!lastSpinDate) return true
  return !isSameUTCDay(lastSpinDate, new Date())
}
