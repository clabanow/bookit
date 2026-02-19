/**
 * Usage Info API
 *
 * GET /api/usage
 *
 * Returns current usage counts for the authenticated user.
 * The generate page fetches this on mount to show remaining
 * AI generations before the user starts working.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAiUsage } from '@/lib/limits/usage'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const ai = await getAiUsage(session.userId)

  return NextResponse.json({ ai })
}
