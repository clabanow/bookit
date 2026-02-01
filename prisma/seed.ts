/**
 * Database Seed Script
 *
 * Creates the initial admin account.
 *
 * Usage:
 *   npx tsx prisma/seed.ts
 *
 * Or set ADMIN_PASSWORD environment variable and run:
 *   ADMIN_PASSWORD=yourpassword npx tsx prisma/seed.ts
 */

import { PrismaClient, Role, ApprovalStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ADMIN_EMAIL = 'clabanow@gmail.com'
const SALT_ROUNDS = 12

async function main() {
  // Get password from environment or use a default for development
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    console.error('Error: ADMIN_PASSWORD environment variable is required')
    console.error('Usage: ADMIN_PASSWORD=yourpassword npx tsx prisma/seed.ts')
    process.exit(1)
  }

  if (adminPassword.length < 8) {
    console.error('Error: Password must be at least 8 characters')
    process.exit(1)
  }

  console.log('Seeding database...')

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  })

  if (existingAdmin) {
    console.log(`Admin user ${ADMIN_EMAIL} already exists.`)

    // Update to ensure they're admin and approved
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: {
        role: Role.ADMIN,
        status: ApprovalStatus.APPROVED,
      },
    })
    console.log('Updated existing user to ADMIN role with APPROVED status.')
  } else {
    // Create admin user
    const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS)

    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        role: Role.ADMIN,
        status: ApprovalStatus.APPROVED,
      },
    })

    console.log(`Created admin user: ${ADMIN_EMAIL}`)
  }

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
