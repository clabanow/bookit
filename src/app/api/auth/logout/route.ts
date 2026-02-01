/**
 * User Logout API
 *
 * POST /api/auth/logout
 *
 * Clears the session cookie.
 */

import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth'

export async function POST() {
  try {
    await clearSession()
    return NextResponse.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}
