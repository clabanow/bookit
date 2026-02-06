'use client'

/**
 * Admin Users Dashboard
 *
 * Allows admins to view and approve/reject user registrations.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface User {
  id: string
  email: string
  role: 'USER' | 'ADMIN'
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  playerCount: number
}

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('PENDING')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const queryParam = filter !== 'ALL' ? `?status=${filter}` : ''
      const res = await fetch(`/api/admin/users${queryParam}`)

      if (res.status === 401) {
        router.push('/login')
        return
      }

      if (res.status === 403) {
        setError('Admin access required')
        setLoading(false)
        return
      }

      if (!res.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await res.json()
      setUsers(data.users)
    } catch {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [filter, router])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  async function handleStatusChange(userId: string, newStatus: 'APPROVED' | 'REJECTED') {
    setActionLoading(userId)

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update user')
      }

      // Refresh list
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setActionLoading(null)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getStatusBadgeClass(status: User['status']) {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'APPROVED':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'REJECTED':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <p className="text-slate-400">Loading users...</p>
      </div>
    )
  }

  if (error === 'Admin access required') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-400 mb-4">Admin access required</p>
            <Button onClick={() => router.push('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl">User Management</CardTitle>
            <Button variant="outline" size="sm" onClick={() => router.push('/')}>
              Back to Home
            </Button>
          </CardHeader>
          <CardContent>
            {/* Filter tabs */}
            <div className="flex gap-2 mb-6">
              {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as StatusFilter[]).map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setFilter(status)
                    setLoading(true)
                  }}
                >
                  {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>

            {error && error !== 'Admin access required' && (
              <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-md mb-4 text-sm">
                {error}
              </div>
            )}

            {/* Users list */}
            {users.length === 0 ? (
              <p className="text-slate-400 text-center py-8">
                No {filter !== 'ALL' ? filter.toLowerCase() : ''} users found
              </p>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">{user.email}</span>
                        {user.role === 'ADMIN' && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">
                            Admin
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded border ${getStatusBadgeClass(user.status)}`}
                        >
                          {user.status}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400">
                        Registered {formatDate(user.createdAt)}
                        {user.playerCount > 0 && ` • ${user.playerCount} player${user.playerCount > 1 ? 's' : ''}`}
                      </div>
                    </div>

                    {user.role !== 'ADMIN' && (
                      <div className="flex gap-2">
                        {user.status !== 'APPROVED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30"
                            disabled={actionLoading === user.id}
                            onClick={() => handleStatusChange(user.id, 'APPROVED')}
                          >
                            {actionLoading === user.id ? '...' : 'Approve'}
                          </Button>
                        )}
                        {user.status !== 'REJECTED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30"
                            disabled={actionLoading === user.id}
                            onClick={() => handleStatusChange(user.id, 'REJECTED')}
                          >
                            {actionLoading === user.id ? '...' : 'Reject'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
