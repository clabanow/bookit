/**
 * Chat Report API
 *
 * POST /api/chat/report — Report a chat message for moderation.
 *
 * For now this just logs the report. In the future, reports could be
 * stored in a Report table for admin review.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { messageId, reason } = body as { messageId?: string; reason?: string }

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 })
    }

    // Log the report for now — future: persist to a Report table
    console.log(`[CHAT REPORT] User ${session.userId} reported message ${messageId}: ${reason || 'no reason'}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Chat report error:', error)
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }
}
