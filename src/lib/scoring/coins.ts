/**
 * Coin Economy
 *
 * Players earn gold coins during games and spend them in the card shop.
 *
 * Per-question rewards:
 *   - 10 coins for a correct answer
 *   - 5 bonus coins per question in a streak (2+ correct in a row)
 *
 * Game-end placement bonus:
 *   - 1st place: 50 coins
 *   - 2nd place: 30 coins
 *   - 3rd place: 20 coins
 *
 * Anti-farming: If a player has already completed a question set,
 * all coins from that game are reduced to 50%.
 */

import { prisma } from '@/lib/db'

/** Coins awarded per correct answer */
const COINS_PER_CORRECT = 10

/** Bonus coins per question when on a streak (2+) */
const STREAK_BONUS = 5

/** Placement bonuses at game end */
const PLACEMENT_BONUSES: Record<number, number> = {
  1: 50,
  2: 30,
  3: 20,
}

/** Multiplier applied to all coins when replaying a question set */
const REPEAT_MULTIPLIER = 0.5

/**
 * Calculate coins earned for answering a single question.
 *
 * @param isCorrect - Whether the answer was correct
 * @param streak - Current streak *after* this answer (0 if wrong, 1+ if right)
 * @returns Coins earned for this question
 */
export function calculateCoinsForQuestion(isCorrect: boolean, streak: number): number {
  if (!isCorrect) return 0

  let coins = COINS_PER_CORRECT

  // Streak bonus kicks in at 2+ correct in a row
  if (streak >= 2) {
    coins += STREAK_BONUS
  }

  return coins
}

/**
 * Calculate the placement bonus at the end of a game.
 *
 * @param rank - Player's final ranking (1-based)
 * @returns Bonus coins for placement
 */
export function calculateGameEndBonus(rank: number): number {
  return PLACEMENT_BONUSES[rank] ?? 0
}

/**
 * Check if a player has previously completed a question set.
 * Returns 0.5 for repeat plays, 1.0 for first play.
 *
 * This prevents "farming" where kids replay the same set to
 * memorize answers and earn easy coins.
 *
 * @param playerId - The player's database ID
 * @param questionSetId - The question set being played
 * @returns Multiplier (1.0 or 0.5)
 */
export async function getRepeatMultiplier(
  playerId: string,
  questionSetId: string
): Promise<number> {
  const previousPlay = await prisma.gamePlay.findFirst({
    where: { playerId, questionSetId },
  })

  return previousPlay ? REPEAT_MULTIPLIER : 1.0
}
