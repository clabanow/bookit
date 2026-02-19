/**
 * AI Usage Tracking Tests
 *
 * Tests for the daily AI generation limit system.
 * We mock Prisma to avoid needing a real database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma before importing the module under test
vi.mock('@/lib/db', () => ({
  prisma: {
    aiGeneration: {
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock config — we'll override dailyAiGenerationLimit per test
vi.mock('@/lib/config', () => ({
  config: {
    dailyAiGenerationLimit: 3,
  },
}))

import { getUTCDayStart, getAiUsage, recordAiGeneration } from '../usage'
import { prisma } from '@/lib/db'
import { config } from '@/lib/config'

describe('getUTCDayStart', () => {
  it('should return midnight UTC of the current day', () => {
    const result = getUTCDayStart()

    expect(result.getUTCHours()).toBe(0)
    expect(result.getUTCMinutes()).toBe(0)
    expect(result.getUTCSeconds()).toBe(0)
    expect(result.getUTCMilliseconds()).toBe(0)
  })

  it('should return today\'s date', () => {
    const result = getUTCDayStart()
    const now = new Date()

    expect(result.getUTCFullYear()).toBe(now.getUTCFullYear())
    expect(result.getUTCMonth()).toBe(now.getUTCMonth())
    expect(result.getUTCDate()).toBe(now.getUTCDate())
  })
})

describe('getAiUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to default limit
    ;(config as { dailyAiGenerationLimit: number }).dailyAiGenerationLimit = 3
  })

  it('should return allowed:true when under limit', async () => {
    vi.mocked(prisma.aiGeneration.count).mockResolvedValue(1)

    const result = await getAiUsage('user-1')

    expect(result).toEqual({
      used: 1,
      limit: 3,
      remaining: 2,
      allowed: true,
    })
  })

  it('should return allowed:false when at limit', async () => {
    vi.mocked(prisma.aiGeneration.count).mockResolvedValue(3)

    const result = await getAiUsage('user-1')

    expect(result).toEqual({
      used: 3,
      limit: 3,
      remaining: 0,
      allowed: false,
    })
  })

  it('should return allowed:false when over limit', async () => {
    vi.mocked(prisma.aiGeneration.count).mockResolvedValue(5)

    const result = await getAiUsage('user-1')

    expect(result).toEqual({
      used: 5,
      limit: 3,
      remaining: 0,
      allowed: false,
    })
  })

  it('should return allowed:true when limit is 0 (disabled)', async () => {
    ;(config as { dailyAiGenerationLimit: number }).dailyAiGenerationLimit = 0

    const result = await getAiUsage('user-1')

    expect(result).toEqual({
      used: 0,
      limit: 0,
      remaining: 0,
      allowed: true,
    })
    // Should not query the database when limit is disabled
    expect(prisma.aiGeneration.count).not.toHaveBeenCalled()
  })

  it('should query with correct userId and date filter', async () => {
    vi.mocked(prisma.aiGeneration.count).mockResolvedValue(0)

    await getAiUsage('user-abc')

    expect(prisma.aiGeneration.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-abc',
        createdAt: { gte: expect.any(Date) },
      },
    })
  })
})

describe('recordAiGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create an AiGeneration record with the correct userId', async () => {
    vi.mocked(prisma.aiGeneration.create).mockResolvedValue({
      id: 'gen-1',
      userId: 'user-1',
      createdAt: new Date(),
    })

    await recordAiGeneration('user-1')

    expect(prisma.aiGeneration.create).toHaveBeenCalledWith({
      data: { userId: 'user-1' },
    })
  })
})
