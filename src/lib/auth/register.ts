/**
 * User Registration Logic
 *
 * Handles user registration with validation.
 * New users start with PENDING status - admin must approve before they can login.
 */

import { prisma } from '@/lib/db'
import { hashPassword } from './password'

// Registration input
export interface RegisterInput {
  email: string
  password: string
}

// Registration result
export interface RegisterResult {
  success: boolean
  error?: string
  userId?: string
}

// Email validation regex - basic but effective
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Password requirements
const MIN_PASSWORD_LENGTH = 8

/**
 * Validate registration input
 */
export function validateRegistration(input: RegisterInput): string | null {
  // Check email format
  if (!input.email || !EMAIL_REGEX.test(input.email)) {
    return 'Please enter a valid email address'
  }

  // Check email length
  if (input.email.length > 255) {
    return 'Email address is too long'
  }

  // Check password length
  if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  }

  // Check password length max
  if (input.password.length > 128) {
    return 'Password is too long'
  }

  return null
}

/**
 * Register a new user
 *
 * Creates a user with PENDING status.
 * Admin must approve before the user can login.
 */
export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  // Validate input
  const validationError = validateRegistration(input)
  if (validationError) {
    return { success: false, error: validationError }
  }

  // Normalize email to lowercase
  const email = input.email.toLowerCase().trim()

  try {
    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    })

    if (existing) {
      // Don't reveal if email exists for security
      // But in this case, we want users to know so they can login instead
      return { success: false, error: 'An account with this email already exists' }
    }

    // Hash password
    const passwordHash = await hashPassword(input.password)

    // Create user with PENDING status
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        // status defaults to PENDING
        // role defaults to USER
      },
    })

    return { success: true, userId: user.id }
  } catch (error) {
    console.error('Registration error:', error)
    return { success: false, error: 'Registration failed. Please try again.' }
  }
}
