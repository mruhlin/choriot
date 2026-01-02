"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import SimpleHeader from "@/components/SimpleHeader"

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface Membership {
  id: string
  userId: string
  groupId: string
  role: "ADMIN" | "MEMBER"
  joinedAt: Date
  user: User
}

interface Group {
  id: string
  name: string
  description: string | null
  memberships: Membership[]
}

interface PendingInvitation {
  id: string
  invitedEmail: string
  createdAt: Date
  expiresAt: Date
}

interface GroupDetailClientProps {
  group: Group
  currentUserId: string
  isAdmin: boolean
  pendingInvitations: PendingInvitation[]
}

export default function GroupDetailClient({ group, currentUserId, isAdmin, pendingInvitations: initialInvitations }: GroupDetailClientProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [pendingInvitations, setPendingInvitations] = useState(initialInvitations)
  const [canceling, setCanceling] = useState<string | null>(null)

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const response = await fetch(`/api/groups/${group.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to add member")
        return
      }

      setSuccess(`Invitation sent to ${email}`)
      setEmail("")
      setPendingInvitations([data, ...pendingInvitations])
      router.refresh()
    } catch (_error) {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    setCanceling(invitationId)
    setError("")

    try {
      const response = await fetch(`/api/invitations/${invitationId}/cancel`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to cancel invitation")
        return
      }

      setPendingInvitations(pendingInvitations.filter(inv => inv.id !== invitationId))
      router.refresh()
    } catch (_error) {
      setError("Something went wrong")
    } finally {
      setCanceling(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SimpleHeader
        title={group.name}
        backLink={{ href: "/dashboard/groups", label: "Back to Groups" }}
      />
      {group.description && (
        <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {group.description}
            </p>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pending Invitations (Admin Only) */}
        {isAdmin && pendingInvitations.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Pending Invitations ({pendingInvitations.length})
            </h2>
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {invitation.invitedEmail}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Invited {new Date(invitation.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                      PENDING
                    </span>
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      disabled={canceling === invitation.id}
                      className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                    >
                      {canceling === invitation.id ? "..." : "Cancel"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Members List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Members ({group.memberships.length})
          </h2>
          <div className="space-y-3">
            {group.memberships.map((membership) => (
              <div
                key={membership.id}
                className="flex items-center gap-3 py-3 border-b border-gray-200 dark:border-gray-700 last:border-0"
              >
                <div className="flex-shrink-0">
                  <Image
                    src={membership.user.image || "/logo.png"}
                    alt={membership.user.name || membership.user.email}
                    width={48}
                    height={48}
                    className="rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/logo.png"
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {membership.user.name || membership.user.email}
                      {membership.userId === currentUserId && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(You)</span>
                      )}
                    </p>
                    {membership.role === "ADMIN" && (
                      <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded flex-shrink-0">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {membership.user.email}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Member Section (Admin Only) */}
        {isAdmin && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Member
            </h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="user@example.com"
                />
              </div>

              {error && (
                <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
              )}

              {success && (
                <div className="text-green-600 dark:text-green-400 text-sm">{success}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 dark:bg-indigo-500 text-white py-2 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Adding..." : "Add Member"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
