/**
 * Current User API
 *
 * GET /api/auth/me
 *
 * Returns the current user's session info, or 401 if not logged in.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      userId: session.userId,
      email: session.email,
      role: session.role,
      status: session.status,
    })
  } catch (error) {
    console.error('Get session API error:', error)
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    )
  }
}
