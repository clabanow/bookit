/**
 * Google OAuth Utilities
 *
 * Handles the OAuth 2.0 flow with Google:
 * 1. Build authorization URL (redirect user to Google)
 * 2. Exchange authorization code for tokens
 * 3. Fetch user info from Google
 *
 * Why custom OAuth instead of NextAuth?
 * - Integrates with our existing JWT session system
 * - Keeps auth logic simple and in one place
 * - No extra dependencies or configuration
 */

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

// Environment variables (server-side only)
function getClientId(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is not set')
  }
  return clientId
}

function getClientSecret(): string {
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientSecret) {
    throw new Error('GOOGLE_CLIENT_SECRET environment variable is not set')
  }
  return clientSecret
}

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${appUrl}/api/auth/callback/google`
}

/**
 * Generate a random state parameter for CSRF protection
 *
 * The state parameter prevents attackers from forging OAuth callbacks.
 * We generate it, store it in a cookie, and verify it when Google redirects back.
 */
export function generateOAuthState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Build the Google OAuth authorization URL
 *
 * This is where we redirect the user to sign in with Google.
 * The URL includes scopes (what data we want) and the state parameter.
 */
export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    // Prompt user to select account (useful when testing)
    prompt: 'select_account',
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/**
 * Token response from Google
 */
interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
  id_token?: string
}

/**
 * Exchange the authorization code for tokens
 *
 * After the user approves on Google, they're redirected back with a code.
 * We exchange this code for an access token to fetch their info.
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      code,
      grant_type: 'authorization_code',
      redirect_uri: getRedirectUri(),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Google token exchange failed:', error)
    throw new Error('Failed to exchange authorization code')
  }

  return response.json()
}

/**
 * User info from Google
 */
export interface GoogleUserInfo {
  id: string // Google's unique user ID
  email: string
  verified_email: boolean
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
}

/**
 * Fetch user info from Google using the access token
 *
 * This gets the user's email, name, and profile picture.
 * We use the 'id' field as our googleId to link accounts.
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Google userinfo fetch failed:', error)
    throw new Error('Failed to fetch user info from Google')
  }

  return response.json()
}
