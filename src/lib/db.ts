/**
 * Prisma Database Client
 *
 * Simple Prisma client setup. The DATABASE_URL is read from the schema.
 */

import 'dotenv/config'

import { PrismaClient } from '@prisma/client'
import { config } from './config'

// Store prisma client on global to reuse across hot reloads in dev
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: config.isDevelopment ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (!config.isProduction) {
  globalForPrisma.prisma = prisma
}

export default prisma
