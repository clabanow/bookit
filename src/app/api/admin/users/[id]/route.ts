/**
 * Admin User Update API
 *
 * PATCH /api/admin/users/[id] - Update user status (admin only)
 * Body: { status: "APPROVED" | "REJECTED" }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import type { ApprovalStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

const VALID_STATUSES: ApprovalStatus[] = ['PENDING', 'APPROVED', 'REJECTED']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await request.json()
    const { status } = body as { status?: ApprovalStatus }

    // Validate status
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be PENDING, APPROVED, or REJECTED' },
        { status: 400 }
      )
    }

    // Prevent admin from modifying their own status
    if (id === session.userId) {
      return NextResponse.json(
        { error: 'Cannot modify your own status' },
        { status: 400 }
      )
    }

    // Check user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent modifying other admins (optional safeguard)
    if (existingUser.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot modify admin user status' },
        { status: 400 }
      )
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      message: `User ${status.toLowerCase()}`,
      user: {
        ...updatedUser,
        createdAt: updatedUser.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Update user API error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
