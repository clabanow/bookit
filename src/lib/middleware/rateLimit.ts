/**
 * Rate Limiting
 *
 * Prevents abuse by limiting how frequently a client can perform actions.
 *
 * Uses a sliding window algorithm:
 * - Track timestamps of recent requests per client
 * - Reject if too many requests in the time window
 *
 * This is an in-memory implementation suitable for single-server deployments.
 * For multi-server deployments, use Redis-based rate limiting.
 */

/**
 * Configuration for a rate limit rule.
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
  /** Custom message for rate limit exceeded */
  message?: string
}

/**
 * Default rate limit configs for different actions.
 */
export const RateLimitConfigs = {
  /** Joining a room - generous limit since it's a one-time action per game */
  joinRoom: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 5 attempts per minute
    message: 'Too many join attempts. Please wait a minute.',
  },
  /** Submitting answers - should be once per question, but allow some retries */
  submitAnswer: {
    maxRequests: 10,
    windowMs: 10 * 1000, // 10 attempts per 10 seconds
    message: 'Too many answer submissions.',
  },
  /** Creating rooms - prevent spam */
  createRoom: {
    maxRequests: 3,
    windowMs: 60 * 1000, // 3 rooms per minute
    message: 'Too many rooms created. Please wait.',
  },
  /** Sending chat messages - 1 message per 2 seconds */
  sendMessage: {
    maxRequests: 1,
    windowMs: 2000, // 1 message per 2 seconds
    message: 'Wait a moment before sending another message.',
  },
} as const

/**
 * In-memory rate limiter using sliding window.
 */
export class RateLimiter {
  /** Map of client ID -> array of request timestamps */
  private requests = new Map<string, number[]>()

  /** Cleanup interval reference */
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Periodically clean up old entries to prevent memory leaks
    this.startCleanup()
  }

  /**
   * Check if a client is rate limited.
   *
   * @param clientId - Unique identifier for the client (e.g., socket ID, IP)
   * @param config - Rate limit configuration
   * @returns true if the request is allowed, false if rate limited
   */
  isAllowed(clientId: string, config: RateLimitConfig): boolean {
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Get existing timestamps for this client
    let timestamps = this.requests.get(clientId) || []

    // Filter to only timestamps within the current window
    timestamps = timestamps.filter((t) => t > windowStart)

    // Check if under the limit
    if (timestamps.length >= config.maxRequests) {
      return false
    }

    // Add current request timestamp
    timestamps.push(now)
    this.requests.set(clientId, timestamps)

    return true
  }

  /**
   * Get the number of remaining requests for a client.
   *
   * @param clientId - Unique identifier for the client
   * @param config - Rate limit configuration
   * @returns Number of requests remaining in the current window
   */
  getRemainingRequests(clientId: string, config: RateLimitConfig): number {
    const now = Date.now()
    const windowStart = now - config.windowMs

    const timestamps = this.requests.get(clientId) || []
    const recentCount = timestamps.filter((t) => t > windowStart).length

    return Math.max(0, config.maxRequests - recentCount)
  }

  /**
   * Get time until rate limit resets for a client.
   *
   * @param clientId - Unique identifier for the client
   * @param config - Rate limit configuration
   * @returns Milliseconds until the oldest request expires, or 0 if not limited
   */
  getResetTime(clientId: string, config: RateLimitConfig): number {
    const now = Date.now()
    const windowStart = now - config.windowMs

    const timestamps = this.requests.get(clientId) || []
    const withinWindow = timestamps.filter((t) => t > windowStart)

    if (withinWindow.length < config.maxRequests) {
      return 0
    }

    // Find the oldest timestamp that's still within the window
    const oldest = Math.min(...withinWindow)
    return oldest + config.windowMs - now
  }

  /**
   * Clear rate limit data for a client.
   * Useful when a client successfully completes an action.
   */
  reset(clientId: string): void {
    this.requests.delete(clientId)
  }

  /**
   * Start periodic cleanup of old entries.
   */
  private startCleanup(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)

    // Don't prevent process from exiting
    this.cleanupInterval.unref()
  }

  /**
   * Remove entries with no recent timestamps.
   */
  private cleanup(): void {
    const now = Date.now()
    const maxAge = 60 * 60 * 1000 // 1 hour

    for (const [clientId, timestamps] of this.requests) {
      // Remove if no timestamps within the last hour
      const recent = timestamps.filter((t) => t > now - maxAge)
      if (recent.length === 0) {
        this.requests.delete(clientId)
      } else if (recent.length < timestamps.length) {
        this.requests.set(clientId, recent)
      }
    }
  }

  /**
   * Stop the cleanup interval.
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Clear all rate limit data.
   */
  clear(): void {
    this.requests.clear()
  }
}

// Singleton instance
let rateLimiter: RateLimiter | null = null

/**
 * Get the rate limiter instance.
 */
export function getRateLimiter(): RateLimiter {
  if (!rateLimiter) {
    rateLimiter = new RateLimiter()
  }
  return rateLimiter
}

/**
 * Convenience function to check if a socket action is rate limited.
 *
 * @param socketId - The socket ID making the request
 * @param action - The action being performed
 * @returns Object with allowed status and error message if blocked
 */
export function checkRateLimit(
  socketId: string,
  action: keyof typeof RateLimitConfigs
): { allowed: boolean; message?: string; retryAfter?: number } {
  const limiter = getRateLimiter()
  const config = RateLimitConfigs[action]

  if (!limiter.isAllowed(socketId, config)) {
    return {
      allowed: false,
      message: config.message,
      retryAfter: Math.ceil(limiter.getResetTime(socketId, config) / 1000),
    }
  }

  return { allowed: true }
}
