'use client'

/**
 * Login Page
 *
 * Users enter their email and password to sign in.
 * Also supports Google OAuth sign-in.
 * Redirects to home or shows pending/rejected status messages.
 */

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { GoogleIcon } from '@/components/icons/GoogleIcon'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [loading, setLoading] = useState(false)

  // Handle OAuth error/pending parameters from callback
  useEffect(() => {
    const oauthError = searchParams.get('error')
    const pending = searchParams.get('pending')

    if (oauthError) {
      const errorMessages: Record<string, string> = {
        google_denied: 'Google sign-in was cancelled',
        invalid_callback: 'Invalid OAuth callback',
        invalid_state: 'Security check failed. Please try again.',
        email_not_verified: 'Your Google email is not verified',
        account_rejected: 'Your account has been rejected',
        oauth_failed: 'Google sign-in failed. Please try again.',
      }
      setError(errorMessages[oauthError] || 'Sign-in failed')
    }

    if (pending === 'true') {
      setIsPending(true)
      setError('Your account is pending approval. An admin will review your registration.')
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsPending(false)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.requiresApproval) {
          setIsPending(true)
        }
        setError(data.error || 'Login failed')
        return
      }

      // Success - redirect to original destination or host page
      router.push(redirectTo)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md mb-4">
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-blue-400 hover:underline"
        >
          &larr; Back to Main Menu
        </Link>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Sign in to your Mack &amp; Lex account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div
                className={`p-3 rounded-md text-sm ${
                  isPending
                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
                role="alert"
              >
                {isPending && (
                  <span className="font-medium block mb-1">Account Pending</span>
                )}
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-2 text-slate-400">or</span>
              </div>
            </div>

            {/* Google Sign-In */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => (window.location.href = '/api/auth/google')}
            >
              <GoogleIcon className="mr-2 h-5 w-5" />
              Sign in with Google
            </Button>

            <p className="text-center text-sm text-slate-400">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-blue-400 hover:text-blue-300">
                Register
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
