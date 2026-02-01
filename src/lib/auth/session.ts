/**
 * Session Management
 *
 * Uses JWT tokens stored in HTTP-only cookies for secure authentication.
 *
 * Why JWT in cookies?
 * - HTTP-only cookies prevent XSS attacks from stealing tokens
 * - JWTs are stateless - no need to store sessions server-side
 * - Works well with Next.js middleware for route protection
 */

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import type { User, Role, ApprovalStatus } from '@prisma/client'

// Session duration: 7 days
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // milliseconds

// Cookie name
const SESSION_COOKIE = 'bookit_session'

// Get secret key from environment (or use a default for development)
function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'development-secret-change-in-production'
  return new TextEncoder().encode(secret)
}

/**
 * Session payload stored in JWT
 */
export interface SessionPayload {
  userId: string
  email: string
  role: Role
}

/**
 * Full session data including user info
 */
export interface Session {
  userId: string
  email: string
  role: Role
  status: ApprovalStatus
}

/**
 * Create a session for a user
 *
 * Creates a JWT and stores it in an HTTP-only cookie.
 */
export async function createSession(user: User): Promise<void> {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  }

  // Create JWT
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey())

  // Set cookie
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // seconds
    path: '/',
  })
}

/**
 * Get the current session from cookies
 *
 * Returns null if not authenticated or session is invalid.
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (!token) {
    return null
  }

  try {
    // Verify JWT
    const { payload } = await jwtVerify(token, getSecretKey())
    const sessionPayload = payload as unknown as SessionPayload

    // Fetch fresh user data to get current status
    const user = await prisma.user.findUnique({
      where: { id: sessionPayload.userId },
      select: { id: true, email: true, role: true, status: true },
    })

    if (!user) {
      return null
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    }
  } catch {
    // Invalid or expired token
    return null
  }
}

/**
 * Clear the session (logout)
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

/**
 * Check if the current user is authenticated and approved
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return session !== null && session.status === 'APPROVED'
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession()
  return session !== null && session.role === 'ADMIN' && session.status === 'APPROVED'
}
