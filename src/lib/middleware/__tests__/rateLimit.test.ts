/**
 * Rate Limiting Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { RateLimiter, checkRateLimit, RateLimitConfigs } from '../rateLimit'

describe('RateLimiter', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter()
    vi.useFakeTimers()
  })

  afterEach(() => {
    limiter.stop()
    limiter.clear()
    vi.useRealTimers()
  })

  describe('isAllowed', () => {
    const config = { maxRequests: 3, windowMs: 1000 }

    it('allows requests under the limit', () => {
      expect(limiter.isAllowed('client1', config)).toBe(true)
      expect(limiter.isAllowed('client1', config)).toBe(true)
      expect(limiter.isAllowed('client1', config)).toBe(true)
    })

    it('blocks requests over the limit', () => {
      limiter.isAllowed('client1', config)
      limiter.isAllowed('client1', config)
      limiter.isAllowed('client1', config)
      expect(limiter.isAllowed('client1', config)).toBe(false)
    })

    it('allows requests again after window expires', () => {
      limiter.isAllowed('client1', config)
      limiter.isAllowed('client1', config)
      limiter.isAllowed('client1', config)
      expect(limiter.isAllowed('client1', config)).toBe(false)

      // Advance time past the window
      vi.advanceTimersByTime(1001)

      expect(limiter.isAllowed('client1', config)).toBe(true)
    })

    it('tracks different clients separately', () => {
      // Max out client1
      limiter.isAllowed('client1', config)
      limiter.isAllowed('client1', config)
      limiter.isAllowed('client1', config)

      // client2 should still be allowed
      expect(limiter.isAllowed('client2', config)).toBe(true)
    })
  })

  describe('getRemainingRequests', () => {
    const config = { maxRequests: 5, windowMs: 1000 }

    it('returns full limit for new client', () => {
      expect(limiter.getRemainingRequests('new-client', config)).toBe(5)
    })

    it('decrements as requests are made', () => {
      limiter.isAllowed('client1', config)
      expect(limiter.getRemainingRequests('client1', config)).toBe(4)

      limiter.isAllowed('client1', config)
      expect(limiter.getRemainingRequests('client1', config)).toBe(3)
    })

    it('returns 0 when limit is reached', () => {
      for (let i = 0; i < 5; i++) {
        limiter.isAllowed('client1', config)
      }
      expect(limiter.getRemainingRequests('client1', config)).toBe(0)
    })
  })

  describe('getResetTime', () => {
    const config = { maxRequests: 2, windowMs: 1000 }

    it('returns 0 when under limit', () => {
      limiter.isAllowed('client1', config)
      expect(limiter.getResetTime('client1', config)).toBe(0)
    })

    it('returns time until reset when at limit', () => {
      limiter.isAllowed('client1', config)
      limiter.isAllowed('client1', config)

      const resetTime = limiter.getResetTime('client1', config)
      expect(resetTime).toBeGreaterThan(0)
      expect(resetTime).toBeLessThanOrEqual(1000)
    })

    it('decreases as time passes', () => {
      limiter.isAllowed('client1', config)
      limiter.isAllowed('client1', config)

      const initialResetTime = limiter.getResetTime('client1', config)

      vi.advanceTimersByTime(500)

      const laterResetTime = limiter.getResetTime('client1', config)
      expect(laterResetTime).toBeLessThan(initialResetTime)
    })
  })

  describe('reset', () => {
    const config = { maxRequests: 2, windowMs: 1000 }

    it('clears rate limit data for client', () => {
      limiter.isAllowed('client1', config)
      limiter.isAllowed('client1', config)
      expect(limiter.isAllowed('client1', config)).toBe(false)

      limiter.reset('client1')

      expect(limiter.isAllowed('client1', config)).toBe(true)
    })
  })
})

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests under the limit', () => {
    const result = checkRateLimit('socket-1', 'joinRoom')
    expect(result.allowed).toBe(true)
    expect(result.message).toBeUndefined()
  })

  it('returns error message when blocked', () => {
    const config = RateLimitConfigs.joinRoom

    // Exhaust the limit
    for (let i = 0; i < config.maxRequests; i++) {
      checkRateLimit('socket-2', 'joinRoom')
    }

    const result = checkRateLimit('socket-2', 'joinRoom')
    expect(result.allowed).toBe(false)
    expect(result.message).toBe(config.message)
    expect(result.retryAfter).toBeGreaterThan(0)
  })
})

describe('RateLimitConfigs', () => {
  it('has config for joinRoom', () => {
    expect(RateLimitConfigs.joinRoom.maxRequests).toBeGreaterThan(0)
    expect(RateLimitConfigs.joinRoom.windowMs).toBeGreaterThan(0)
  })

  it('has config for submitAnswer', () => {
    expect(RateLimitConfigs.submitAnswer.maxRequests).toBeGreaterThan(0)
    expect(RateLimitConfigs.submitAnswer.windowMs).toBeGreaterThan(0)
  })

  it('has config for createRoom', () => {
    expect(RateLimitConfigs.createRoom.maxRequests).toBeGreaterThan(0)
    expect(RateLimitConfigs.createRoom.windowMs).toBeGreaterThan(0)
  })
})
