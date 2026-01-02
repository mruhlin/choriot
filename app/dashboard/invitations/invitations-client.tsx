"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { formatInTimeZone } from "date-fns-tz"
import SimpleHeader from "@/components/SimpleHeader"

interface Invitation {
  id: string
  invitedEmail: string
  createdAt: Date
  expiresAt: Date
  group: {
    id: string
    name: string
    description: string | null
  }
  invitedBy: {
    id: string
    name: string | null
    email: string
  }
}

interface InvitationsClientProps {
  invitations: Invitation[]
  userTimezone: string
}

export default function InvitationsClient({ invitations: initialInvitations, userTimezone }: InvitationsClientProps) {
  const router = useRouter()
  const [invitations, setInvitations] = useState(initialInvitations)
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState("")

  const handleAccept = async (invitationId: string) => {
    setProcessing(invitationId)
    setError("")

    try {
      const response = await fetch(`/api/invitations/${invitationId}/accept`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to accept invitation")
        return
      }

      // Remove from list
      setInvitations(invitations.filter(inv => inv.id !== invitationId))
      router.refresh()
    } catch (_error) {
      setError("Something went wrong")
    } finally {
      setProcessing(null)
    }
  }

  const handleDecline = async (invitationId: string) => {
    setProcessing(invitationId)
    setError("")

    try {
      const response = await fetch(`/api/invitations/${invitationId}/decline`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to decline invitation")
        return
      }

      // Remove from list
      setInvitations(invitations.filter(inv => inv.id !== invitationId))
      router.refresh()
    } catch (_error) {
      setError("Something went wrong")
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SimpleHeader
        title="Group Invitations"
        backLink={{ href: "/dashboard", label: "Back to Dashboard" }}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {invitations.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No pending invitations</p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {invitation.group.name}
                    </h2>
                    {invitation.group.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        {invitation.group.description}
                      </p>
                    )}
                    <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                      <p>
                        Invited by: {invitation.invitedBy.name || invitation.invitedBy.email}
                      </p>
                      <p>
                        Sent: {formatInTimeZone(new Date(invitation.createdAt), userTimezone, "MMM d, yyyy 'at' h:mm a")}
                      </p>
                      <p>
                        Expires: {formatInTimeZone(new Date(invitation.expiresAt), userTimezone, "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    <button
                      onClick={() => handleAccept(invitation.id)}
                      disabled={processing === invitation.id}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {processing === invitation.id ? "..." : "Accept"}
                    </button>
                    <button
                      onClick={() => handleDecline(invitation.id)}
                      disabled={processing === invitation.id}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {processing === invitation.id ? "..." : "Decline"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
