/**
 * Google OAuth Callback
 *
 * GET /api/auth/callback/google
 *
 * Handles the redirect from Google after user approves.
 * Exchanges the authorization code for user info and creates a session.
 *
 * Flow:
 * 1. Verify state parameter matches cookie (CSRF protection)
 * 2. Exchange authorization code for access token
 * 3. Fetch user info from Google
 * 4. Verify email is verified
 * 5. Find or create user in database
 * 6. Create session (JWT cookie)
 * 7. Redirect to app (or show pending message for new users)
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  findOrCreateGoogleUser,
  createSession,
} from '@/lib/auth'

// State cookie name (must match the one in /api/auth/google)
const STATE_COOKIE = 'bookit_oauth_state'

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Check for OAuth errors from Google
    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(`${appUrl}/login?error=google_denied`)
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('Missing code or state parameter')
      return NextResponse.redirect(`${appUrl}/login?error=invalid_callback`)
    }

    // Verify state matches (CSRF protection)
    const cookieStore = await cookies()
    const storedState = cookieStore.get(STATE_COOKIE)?.value

    if (!storedState || storedState !== state) {
      console.error('State mismatch - possible CSRF attack')
      return NextResponse.redirect(`${appUrl}/login?error=invalid_state`)
    }

    // Clear state cookie
    cookieStore.delete(STATE_COOKIE)

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Fetch user info from Google
    const googleUser = await fetchGoogleUserInfo(tokens.access_token)

    // Verify email is verified (security check)
    if (!googleUser.verified_email) {
      console.error('Google email not verified:', googleUser.email)
      return NextResponse.redirect(`${appUrl}/login?error=email_not_verified`)
    }

    // Find or create user in our database
    const { user } = await findOrCreateGoogleUser({
      email: googleUser.email,
      googleId: googleUser.id,
    })

    // Create session (sets JWT cookie)
    await createSession(user)

    // Redirect based on user status
    if (user.status === 'PENDING') {
      // New or pending user - show pending message
      return NextResponse.redirect(`${appUrl}/login?pending=true`)
    }

    if (user.status === 'REJECTED') {
      return NextResponse.redirect(`${appUrl}/login?error=account_rejected`)
    }

    // Approved user - redirect to app
    // If this was a new user who somehow got auto-approved (admin?), go to host
    return NextResponse.redirect(`${appUrl}/host`)
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`)
  }
}
