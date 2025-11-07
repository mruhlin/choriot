"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { format, isToday, isTomorrow, isPast } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import type { ChoreInstance } from "@/lib/chore-schedule"
import { groupChoresByDateWithRecurringCollapse, collapseEmptyDateRanges } from "@/lib/recurring-chores-ui"

interface DashboardClientProps {
  user: {
    id: string
    name?: string | null
    email: string
    timezone: string
  }
  choreInstances: ChoreInstance[]
  groups: Array<{
    id: string
    name: string
    memberships: Array<{
      user: { id: string; name: string | null; email: string }
    }>
  }>
}

export default function DashboardClient({ user, choreInstances: initialInstances, groups }: DashboardClientProps) {
  const router = useRouter()
  const [choreInstances, setChoreInstances] = useState(initialInstances)
  const [completing, setCompleting] = useState<string | null>(null)
  const [expandedRecurringDates, setExpandedRecurringDates] = useState<Set<string>>(new Set())
  const [expandedDateRanges, setExpandedDateRanges] = useState<Set<string>>(new Set())

  const handleComplete = async (choreId: string, dueDate: Date) => {
    const key = `${choreId}-${dueDate.toISOString()}`
    setCompleting(key)

    try {
      const response = await fetch(`/api/chores/${choreId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueDate: dueDate.toISOString(),
        }),
      })

      if (response.ok) {
        // Update local state
        setChoreInstances(instances =>
          instances.map(instance =>
            instance.choreId === choreId && 
            instance.dueDate.toISOString() === dueDate.toISOString()
              ? {
                  ...instance,
                  isCompleted: true,
                  completedBy: { id: user.id, name: user.name || null },
                  completedAt: new Date(),
                }
              : instance
          )
        )
        router.refresh()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to complete chore")
      }
    } catch (_error) {
      alert("Something went wrong")
    } finally {
      setCompleting(null)
    }
  }

  const getDayLabel = (date: Date) => {
    if (isToday(date)) return "Today"
    if (isTomorrow(date)) return "Tomorrow"
    return formatInTimeZone(date, user.timezone, "EEEE, MMM d")
  }

  const toggleRecurringExpanded = (dateKey: string) => {
    setExpandedRecurringDates(prev => {
      const next = new Set(prev)
      if (next.has(dateKey)) {
        next.delete(dateKey)
      } else {
        next.add(dateKey)
      }
      return next
    })
  }

  const toggleDateRangeExpanded = (rangeKey: string) => {
    setExpandedDateRanges(prev => {
      const next = new Set(prev)
      if (next.has(rangeKey)) {
        next.delete(rangeKey)
      } else {
        next.add(rangeKey)
      }
      return next
    })
  }

  // Group instances by date with recurring collapse, then collapse empty date ranges
  const dateGroups = groupChoresByDateWithRecurringCollapse(choreInstances)
  const groupsWithCollapse = collapseEmptyDateRanges(dateGroups)

  const totalPoints = choreInstances
    .filter(i => i.isCompleted && i.completedBy?.id === user.id)
    .reduce((sum, i) => sum + i.points, 0)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image 
              src="/logo.png" 
              alt="Choriot Logo" 
              width={40} 
              height={40}
              className="object-contain"
            />
            <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">Choriot</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {user.name || user.email}
            </span>
            <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-3 py-1 rounded-full text-sm font-medium">
              {totalPoints} pts
            </span>
            <Link
              href="/dashboard/groups"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Groups
            </Link>
            <Link
              href="/dashboard/chores/new"
              className="bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 dark:hover:bg-indigo-600"
            >
              New Chore
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">Your Groups</h2>
              {groups.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No groups yet</p>
              ) : (
                <ul className="space-y-2">
                  {groups.map(group => (
                    <li key={group.id}>
                      <Link
                        href={`/dashboard/groups/${group.id}`}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline block"
                      >
                        {group.name}
                      </Link>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {group.memberships.length} members
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/dashboard/groups/new"
                className="mt-4 block text-sm text-center text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                + Create Group
              </Link>
            </div>
          </div>

          {/* Chore Schedule */}
          <div className="lg:col-span-3">
            <h2 className="text-2xl font-bold mb-6 dark:text-white">Upcoming Chores</h2>
            {groupsWithCollapse.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">No chores scheduled</p>
                <Link
                  href="/dashboard/chores/new"
                  className="mt-4 inline-block text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Create your first chore
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {groupsWithCollapse.map((item) => {
                  if (item.type === 'visible') {
                    const group = item.group
                    const isExpanded = expandedRecurringDates.has(group.dateKey)
                    const hasHiddenRecurring = group.hiddenRecurringChores.length > 0
                    
                    return (
                      <div key={group.dateKey} className="bg-white dark:bg-gray-800 rounded-lg shadow">
                        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b dark:border-gray-600">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {getDayLabel(group.date)}
                          </h3>
                        </div>
                        <ul className="divide-y dark:divide-gray-700">
                          {group.visibleChores.map((instance) => {
                            const key = `${instance.choreId}-${instance.dueDate.toISOString()}`
                            const isOverdue = isPast(instance.dueDate) && !instance.isCompleted
                            
                            return (
                              <li key={key} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-medium text-gray-900 dark:text-white">
                                        {instance.title}
                                      </h4>
                                      {instance.groupName && (
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                          {instance.groupName}
                                        </span>
                                      )}
                                      {isOverdue && (
                                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                          Overdue
                                        </span>
                                      )}
                                      {instance.isCompleted && (
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                          ✓ Completed
                                        </span>
                                      )}
                                    </div>
                                    {instance.description && (
                                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                        {instance.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                      {instance.dueTime && (
                                        <span>Due at {instance.dueTime}</span>
                                      )}
                                      {instance.assignedUser && (
                                        <span>
                                          Assigned to: {instance.assignedUser.name || instance.assignedUser.email}
                                        </span>
                                      )}
                                      <span>{instance.points} pts</span>
                                    </div>
                                    {instance.isCompleted && instance.completedBy && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Completed by {instance.completedBy.name || "someone"} 
                                        {instance.completedAt && ` at ${formatInTimeZone(instance.completedAt, user.timezone, "h:mm a")}`}
                                      </p>
                                    )}
                                  </div>
                                  {!instance.isCompleted && (
                                    <button
                                      onClick={() => handleComplete(instance.choreId, instance.dueDate)}
                                      disabled={completing === key}
                                      className="ml-4 bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                                    >
                                      {completing === key ? "..." : "Complete"}
                                    </button>
                                  )}
                                </div>
                              </li>
                            )
                          })}
                          {hasHiddenRecurring && (
                            <>
                              <li className="px-6 py-3">
                                <button
                                  onClick={() => toggleRecurringExpanded(group.dateKey)}
                                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                >
                                  <span className="inline-block w-4 text-center">
                                    {isExpanded ? "▼" : "▶"}
                                  </span>
                                  [+{group.hiddenRecurringChores.length} recurring]
                                </button>
                              </li>
                              {isExpanded && (
                                <li className="px-6 py-4 bg-gray-50 dark:bg-gray-700">
                                  <ul className="space-y-2">
                                    {group.hiddenRecurringChores.map((instance) => {
                                      const key = `${instance.choreId}-${instance.dueDate.toISOString()}`
                                      return (
                                        <li key={key} className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                              {instance.title}
                                            </p>
                                          </div>
                                          <button
                                            onClick={() => handleComplete(instance.choreId, instance.dueDate)}
                                            disabled={completing === key}
                                            className="ml-4 bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                                          >
                                            {completing === key ? "..." : "Done"}
                                          </button>
                                        </li>
                                      )
                                    })}
                                  </ul>
                                </li>
                              )}
                            </>
                          )}
                        </ul>
                      </div>
                    )
                  } else {
                    // Collapsed date range
                    const range = item.range
                    const rangeKey = `${range.startDate.toISOString()}-${range.endDate.toISOString()}`
                    const isExpanded = expandedDateRanges.has(rangeKey)
                    
                    return (
                      <div key={rangeKey}>
                        <button
                          onClick={() => toggleDateRangeExpanded(rangeKey)}
                          className="w-full text-left px-6 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between"
                        >
                          <span>
                            {isExpanded ? "▼" : "▶"} {formatInTimeZone(range.startDate, user.timezone, "MMM d")} – {formatInTimeZone(range.endDate, user.timezone, "MMM d")}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">...
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="mt-3 space-y-3">
                            {range.dateGroups.map((group) => {
                              const isRecurringExpanded = expandedRecurringDates.has(group.dateKey)
                              const hasHiddenRecurring = group.hiddenRecurringChores.length > 0
                              
                              return (
                                <div key={group.dateKey} className="bg-white dark:bg-gray-800 rounded-lg shadow">
                                  <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b dark:border-gray-600">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                      {getDayLabel(group.date)}
                                    </h3>
                                  </div>
                                  <ul className="divide-y dark:divide-gray-700">
                                    {group.visibleChores.map((instance) => {
                                      const key = `${instance.choreId}-${instance.dueDate.toISOString()}`
                                      const isOverdue = isPast(instance.dueDate) && !instance.isCompleted
                                      
                                      return (
                                        <li key={key} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2">
                                                <h4 className="font-medium text-gray-900 dark:text-white">
                                                  {instance.title}
                                                </h4>
                                                {instance.groupName && (
                                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                    {instance.groupName}
                                                  </span>
                                                )}
                                                {isOverdue && (
                                                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                                    Overdue
                                                  </span>
                                                )}
                                                {instance.isCompleted && (
                                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                    ✓ Completed
                                                  </span>
                                                )}
                                              </div>
                                              {instance.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                                  {instance.description}
                                                </p>
                                              )}
                                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                {instance.dueTime && (
                                                  <span>Due at {instance.dueTime}</span>
                                                )}
                                                {instance.assignedUser && (
                                                  <span>
                                                    Assigned to: {instance.assignedUser.name || instance.assignedUser.email}
                                                  </span>
                                                )}
                                                <span>{instance.points} pts</span>
                                              </div>
                                              {instance.isCompleted && instance.completedBy && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                  Completed by {instance.completedBy.name || "someone"} 
                                                  {instance.completedAt && ` at ${formatInTimeZone(instance.completedAt, user.timezone, "h:mm a")}`}
                                                </p>
                                              )}
                                            </div>
                                            {!instance.isCompleted && (
                                              <button
                                                onClick={() => handleComplete(instance.choreId, instance.dueDate)}
                                                disabled={completing === key}
                                                className="ml-4 bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                                              >
                                                {completing === key ? "..." : "Complete"}
                                              </button>
                                            )}
                                          </div>
                                        </li>
                                      )
                                    })}
                                    {hasHiddenRecurring && (
                                      <>
                                        <li className="px-6 py-3">
                                          <button
                                            onClick={() => toggleRecurringExpanded(group.dateKey)}
                                            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                          >
                                            <span className="inline-block w-4 text-center">
                                              {isRecurringExpanded ? "▼" : "▶"}
                                            </span>
                                            [+{group.hiddenRecurringChores.length} recurring]
                                          </button>
                                        </li>
                                        {isRecurringExpanded && (
                                          <li className="px-6 py-4 bg-gray-50 dark:bg-gray-700">
                                            <ul className="space-y-2">
                                              {group.hiddenRecurringChores.map((instance) => {
                                                const key = `${instance.choreId}-${instance.dueDate.toISOString()}`
                                                return (
                                                  <li key={key} className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                      <p className="text-sm text-gray-700 dark:text-gray-300">
                                                        {instance.title}
                                                      </p>
                                                    </div>
                                                    <button
                                                      onClick={() => handleComplete(instance.choreId, instance.dueDate)}
                                                      disabled={completing === key}
                                                      className="ml-4 bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                                                    >
                                                      {completing === key ? "..." : "Done"}
                                                    </button>
                                                  </li>
                                                )
                                              })}
                                            </ul>
                                          </li>
                                        )}
                                      </>
                                    )}
                                  </ul>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  }
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
