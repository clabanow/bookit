/**
 * Application Configuration
 *
 * Centralized configuration management for all environment variables.
 *
 * Why centralize configuration?
 * 1. Single source of truth - all env vars documented in one place
 * 2. Type safety - TypeScript catches typos and missing vars
 * 3. Validation - fail fast if required vars are missing
 * 4. Defaults - sensible defaults for development
 *
 * Usage:
 *   import { config } from '@/lib/config'
 *   console.log(config.port) // 3000
 */

/**
 * Environment type
 */
export type Environment = 'development' | 'production' | 'test'

/**
 * Session store type - which backend to use for game sessions
 */
export type SessionStoreType = 'memory' | 'redis'

/**
 * Application configuration interface
 */
export interface AppConfig {
  // Environment
  nodeEnv: Environment
  isDevelopment: boolean
  isProduction: boolean
  isTest: boolean

  // Server
  port: number
  hostname: string

  // Database
  databaseUrl: string | undefined

  // Session store
  sessionStoreType: SessionStoreType
  redisUrl: string | undefined

  // Socket.IO
  corsOrigin: string | string[]

  // Rate limiting (can be tuned per environment)
  rateLimitEnabled: boolean

  // AI usage limits (0 = unlimited, for testing)
  dailyAiGenerationLimit: number
}

/**
 * Parse environment and provide defaults.
 *
 * This function is called once at startup to create the config object.
 * It validates required variables and sets sensible defaults.
 */
function parseConfig(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as Environment

  // Validate NODE_ENV is a known value
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    console.warn(`Unknown NODE_ENV: ${nodeEnv}, defaulting to development`)
  }

  const isDevelopment = nodeEnv === 'development'
  const isProduction = nodeEnv === 'production'
  const isTest = nodeEnv === 'test'

  // Session store type defaults to memory for dev, redis for prod
  const sessionStoreType = (process.env.SESSION_STORE_TYPE ||
    (isProduction ? 'redis' : 'memory')) as SessionStoreType

  // CORS origin - in production, should be set explicitly
  // In development, allow all origins for easier testing
  const corsOrigin = process.env.CORS_ORIGIN || (isProduction ? '' : '*')

  return {
    // Environment
    nodeEnv,
    isDevelopment,
    isProduction,
    isTest,

    // Server
    port: parseInt(process.env.PORT || '3000', 10),
    // In production, always bind to 0.0.0.0 to accept external connections
    // (Railway sets HOSTNAME to container ID, which we don't want to use for binding)
    hostname: isProduction ? '0.0.0.0' : (process.env.HOSTNAME || 'localhost'),

    // Database - required in production, optional in development
    databaseUrl: process.env.DATABASE_URL,

    // Session store
    sessionStoreType,
    redisUrl: process.env.REDIS_URL,

    // Socket.IO
    corsOrigin,

    // Rate limiting - enabled everywhere except tests
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false' && !isTest,

    // AI usage limits - default 3 per day; set to 0 to disable (for testing)
    dailyAiGenerationLimit: parseInt(process.env.DAILY_AI_GENERATION_LIMIT || '3', 10),
  }
}

/**
 * Validate configuration for production.
 *
 * Throws if required production variables are missing.
 */
export function validateProductionConfig(cfg: AppConfig): void {
  const errors: string[] = []

  if (cfg.isProduction) {
    if (!cfg.databaseUrl) {
      errors.push('DATABASE_URL is required in production')
    }

    if (cfg.sessionStoreType === 'redis' && !cfg.redisUrl) {
      errors.push('REDIS_URL is required when SESSION_STORE_TYPE=redis')
    }

    if (!cfg.corsOrigin || cfg.corsOrigin === '*') {
      errors.push('CORS_ORIGIN should be set explicitly in production (not *)')
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.map((e) => `  - ${e}`).join('\n')}`)
  }
}

/**
 * The application configuration singleton.
 *
 * Parsed once at module load time.
 */
export const config: AppConfig = parseConfig()

/**
 * Log configuration on startup (non-sensitive values only).
 *
 * Call this in your server startup to see the current config.
 */
export function logConfig(): void {
  console.log('📋 Configuration:')
  console.log(`   Environment: ${config.nodeEnv}`)
  console.log(`   Port: ${config.port}`)
  console.log(`   Hostname: ${config.hostname}`)
  console.log(`   Session Store: ${config.sessionStoreType}`)
  console.log(`   Database: ${config.databaseUrl ? '✓ configured' : '✗ not configured'}`)
  console.log(`   Redis: ${config.redisUrl ? '✓ configured' : '✗ not configured'}`)
  console.log(`   Rate Limiting: ${config.rateLimitEnabled ? 'enabled' : 'disabled'}`)
}
