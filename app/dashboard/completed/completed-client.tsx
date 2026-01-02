"use client"

import { useState } from "react"
import { formatInTimeZone } from "date-fns-tz"
import Link from "next/link"
import DashboardHeader from "@/components/DashboardHeader"

interface CompletedClientProps {
  user: {
    id: string
    name?: string | null
    email: string
    timezone: string
    image?: string | null
  }
  completions: Array<{
    id: string
    completedAt: Date
    dueDate: Date
    user: {
      id: string
      name: string | null
      email: string
    }
    chore: {
      id: string
      title: string
      description: string | null
      points: number
      group: {
        id: string
        name: string
      } | null
    }
  }>
  pendingInvitationsCount: number
}

export default function CompletedClient({ user, completions: initialCompletions, pendingInvitationsCount }: CompletedClientProps) {
  const [completions, setCompletions] = useState(initialCompletions)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialCompletions.length === 50)

  const loadMore = async () => {
    if (loading || !hasMore) return
    
    setLoading(true)
    try {
      const lastCompletion = completions[completions.length - 1]
      const response = await fetch(`/api/completions?limit=50&before=${lastCompletion.completedAt}`)
      
      if (response.ok) {
        const newCompletions = await response.json()
        setCompletions([...completions, ...newCompletions])
        setHasMore(newCompletions.length === 50)
      }
    } catch (error) {
      console.error("Failed to load more completions", error)
    } finally {
      setLoading(false)
    }
  }

  const totalPoints = completions
    .filter(c => c.user.id === user.id)
    .reduce((sum, c) => sum + c.chore.points, 0)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader
        user={user}
        totalPoints={totalPoints}
        pendingInvitationsCount={pendingInvitationsCount}
        activeTab="completed"
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold mb-6 dark:text-white">Completed Chores</h2>
        
        {completions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No completed chores yet</p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Go to Home
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {completions.map((completion) => (
              <div
                key={completion.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {completion.chore.title}
                      </h3>
                      {completion.chore.group && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {completion.chore.group.name}
                        </span>
                      )}
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        ✓ Completed
                      </span>
                    </div>
                    {completion.chore.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {completion.chore.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        Completed by {completion.user.name || completion.user.email}
                      </span>
                      <span>
                        {formatInTimeZone(new Date(completion.completedAt), user.timezone, "MMM d, yyyy 'at' h:mm a")}
                      </span>
                      <span>{completion.chore.points} pts</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="text-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-2 rounded-md text-sm hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
