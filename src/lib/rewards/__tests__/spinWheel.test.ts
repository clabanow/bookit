import { describe, it, expect } from 'vitest'
import { SPIN_PRIZES, spinWheel, isSameUTCDay, canSpinToday } from '../spinWheel'

describe('SPIN_PRIZES', () => {
  it('weights sum to 100', () => {
    const totalWeight = SPIN_PRIZES.reduce((sum, p) => sum + p.weight, 0)
    expect(totalWeight).toBe(100)
  })

  it('prizes are in ascending coin order', () => {
    for (let i = 1; i < SPIN_PRIZES.length; i++) {
      expect(SPIN_PRIZES[i].coins).toBeGreaterThan(SPIN_PRIZES[i - 1].coins)
    }
  })

  it('has 7 prize tiers', () => {
    expect(SPIN_PRIZES).toHaveLength(7)
  })
})

describe('spinWheel', () => {
  it('returns 10 coins for randomValue 0', () => {
    const { prize, index } = spinWheel(0)
    expect(prize.coins).toBe(10)
    expect(index).toBe(0)
  })

  it('returns 1000 coins for randomValue 0.999', () => {
    const { prize, index } = spinWheel(0.999)
    expect(prize.coins).toBe(1000)
    expect(index).toBe(6)
  })

  it('returns 25 coins for randomValue 0.36 (just past 35% boundary)', () => {
    const { prize } = spinWheel(0.36)
    expect(prize.coins).toBe(25)
  })

  it('returns a valid prize with no argument', () => {
    const { prize, index } = spinWheel()
    expect(SPIN_PRIZES).toContain(prize)
    expect(index).toBeGreaterThanOrEqual(0)
    expect(index).toBeLessThan(SPIN_PRIZES.length)
  })
})

describe('isSameUTCDay', () => {
  it('returns true for same day', () => {
    const a = new Date('2026-02-06T10:00:00Z')
    const b = new Date('2026-02-06T23:59:59Z')
    expect(isSameUTCDay(a, b)).toBe(true)
  })

  it('returns false for different days', () => {
    const a = new Date('2026-02-06T23:59:59Z')
    const b = new Date('2026-02-07T00:00:00Z')
    expect(isSameUTCDay(a, b)).toBe(false)
  })

  it('handles midnight boundary correctly', () => {
    const beforeMidnight = new Date('2026-02-06T23:59:59.999Z')
    const afterMidnight = new Date('2026-02-07T00:00:00.000Z')
    expect(isSameUTCDay(beforeMidnight, afterMidnight)).toBe(false)
  })

  it('returns true for same day different times', () => {
    const morning = new Date('2026-02-06T06:00:00Z')
    const evening = new Date('2026-02-06T18:00:00Z')
    expect(isSameUTCDay(morning, evening)).toBe(true)
  })
})

describe('canSpinToday', () => {
  it('returns true when lastSpinDate is null (never spun)', () => {
    expect(canSpinToday(null)).toBe(true)
  })

  it('returns false when lastSpinDate is today', () => {
    expect(canSpinToday(new Date())).toBe(false)
  })

  it('returns true when lastSpinDate is yesterday', () => {
    const yesterday = new Date()
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    expect(canSpinToday(yesterday)).toBe(true)
  })
})
