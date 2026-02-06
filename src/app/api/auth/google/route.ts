/**
 * Google OAuth Initiation
 *
 * GET /api/auth/google
 *
 * Redirects the user to Google's OAuth consent page.
 * Sets a state cookie for CSRF protection.
 *
 * Flow:
 * 1. Generate random state parameter
 * 2. Store state in HTTP-only cookie
 * 3. Redirect to Google with state
 * 4. Google redirects back to /api/auth/callback/google with code + state
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateOAuthState, buildGoogleAuthUrl } from '@/lib/auth'

// State cookie name
const STATE_COOKIE = 'mack_oauth_state'
// State expires in 10 minutes
const STATE_MAX_AGE = 10 * 60

export async function GET() {
  try {
    // Generate state for CSRF protection
    const state = generateOAuthState()

    // Build the Google auth URL
    const authUrl = buildGoogleAuthUrl(state)

    // Store state in cookie (we'll verify it in the callback)
    const cookieStore = await cookies()
    cookieStore.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: STATE_MAX_AGE,
      path: '/',
    })

    // Redirect to Google
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Google OAuth initiation error:', error)
    // Redirect to login with error
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`)
  }
}
