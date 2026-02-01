/**
 * User Registration API
 *
 * POST /api/auth/register
 *
 * Creates a new user account with PENDING status.
 * Admin must approve before the user can login.
 */

import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Register the user
    const result = await registerUser({ email, password })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Success - user created with PENDING status
    return NextResponse.json({
      message: 'Registration successful. Please wait for admin approval.',
      userId: result.userId,
    })
  } catch (error) {
    console.error('Registration API error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
