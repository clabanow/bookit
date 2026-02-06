/**
 * Next.js Middleware for Authentication
 *
 * Protects routes that require authentication.
 * Unauthenticated users are redirected to /login with a redirect param.
 *
 * Protected routes:
 * - /join - Players must be logged in to join games
 * - /play/* - Game pages require authentication
 * - /host - Hosts must be logged in to create games
 * - /admin/* - Admin pages require authentication
 * - /account/* - Account management requires authentication
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// Cookie name must match session.ts
const SESSION_COOKIE = 'bookit_session'

// Routes that require authentication
const protectedPaths = ['/join', '/play', '/host', '/admin', '/account', '/chat', '/spin']

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'development-secret-change-in-production'
  return new TextEncoder().encode(secret)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if this is a protected path
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))

  if (!isProtected) {
    return NextResponse.next()
  }

  // Get session token from cookie
  const token = request.cookies.get(SESSION_COOKIE)?.value

  if (!token) {
    // No token - redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    // Verify the JWT
    await jwtVerify(token, getSecretKey())

    // Token is valid - allow request
    return NextResponse.next()
  } catch {
    // Invalid token - redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
}

// Configure which paths middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
