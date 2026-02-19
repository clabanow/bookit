/**
 * AI Generation Usage Tracking
 *
 * Enforces a daily cap on AI question generations per user to control
 * Anthropic API costs. Each AI generation costs ~$0.002–0.005 (Haiku),
 * so a daily cap of 3 keeps costs predictable.
 *
 * How it works:
 * - Each generation creates an AiGeneration record in the database
 * - We count records created since midnight UTC to check the daily limit
 * - If dailyAiGenerationLimit is 0, the limit is disabled (useful for testing)
 */

import { prisma } from '@/lib/db'
import { config } from '@/lib/config'

export interface AiUsage {
  used: number
  limit: number
  remaining: number
  allowed: boolean
}

/**
 * Get the start of the current UTC day (midnight UTC).
 *
 * We use UTC so the limit resets at the same time globally,
 * consistent with how the daily spin works.
 */
export function getUTCDayStart(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/**
 * Check how many AI generations a user has made today.
 *
 * Returns usage info including whether another generation is allowed.
 * If the limit is set to 0, it's disabled — always allowed.
 */
export async function getAiUsage(userId: string): Promise<AiUsage> {
  const limit = config.dailyAiGenerationLimit

  // Limit of 0 means unlimited (disabled)
  if (limit === 0) {
    return { used: 0, limit: 0, remaining: 0, allowed: true }
  }

  const used = await prisma.aiGeneration.count({
    where: {
      userId,
      createdAt: { gte: getUTCDayStart() },
    },
  })

  const remaining = Math.max(0, limit - used)

  return {
    used,
    limit,
    remaining,
    allowed: used < limit,
  }
}

/**
 * Record that a user made an AI generation.
 *
 * Called after a successful generation so we only count
 * generations that actually used API tokens.
 */
export async function recordAiGeneration(userId: string): Promise<void> {
  await prisma.aiGeneration.create({
    data: { userId },
  })
}
