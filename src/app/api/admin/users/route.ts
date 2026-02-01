/**
 * Admin Users API
 *
 * GET /api/admin/users - List all users (admin only)
 * Supports query params: status=PENDING|APPROVED|REJECTED
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import type { ApprovalStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check admin role
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get filter from query params
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') as ApprovalStatus | null

    // Build query
    const where = statusFilter ? { status: statusFilter } : {}

    // Fetch users
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: { players: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Format response
    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      playerCount: user._count.players,
    }))

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error('List users API error:', error)
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
  }
}
