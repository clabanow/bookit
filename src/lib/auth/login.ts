/**
 * User Login Logic
 *
 * Handles credential verification and session creation.
 */

import { prisma } from '@/lib/db'
import { verifyPassword } from './password'
import { createSession } from './session'

// Login input
export interface LoginInput {
  email: string
  password: string
}

// Login result
export interface LoginResult {
  success: boolean
  error?: string
  requiresApproval?: boolean
}

/**
 * Login a user
 *
 * Verifies credentials and creates a session if successful.
 */
export async function loginUser(input: LoginInput): Promise<LoginResult> {
  // Normalize email
  const email = input.email.toLowerCase().trim()

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  })

  // User not found - use generic message for security
  if (!user) {
    return { success: false, error: 'Invalid email or password' }
  }

  // Check if user has a password (OAuth-only users won't)
  if (!user.passwordHash) {
    // User signed up with Google, has no password
    return {
      success: false,
      error: 'This account uses Google sign-in. Please use "Sign in with Google".',
    }
  }

  // Verify password
  const isValid = await verifyPassword(input.password, user.passwordHash)
  if (!isValid) {
    return { success: false, error: 'Invalid email or password' }
  }

  // Check approval status
  if (user.status === 'PENDING') {
    return {
      success: false,
      error: 'Your account is pending approval. Please wait for an admin to approve your registration.',
      requiresApproval: true,
    }
  }

  if (user.status === 'REJECTED') {
    return {
      success: false,
      error: 'Your registration was not approved. Please contact an administrator.',
    }
  }

  // Create session
  await createSession(user)

  return { success: true }
}
