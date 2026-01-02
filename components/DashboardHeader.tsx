"use client"

import Link from "next/link"
import Image from "next/image"
import { signOut } from "next-auth/react"

interface User {
  id: string
  name?: string | null
  email: string
  image?: string | null
  timezone: string
}

interface DashboardHeaderProps {
  user: User
  totalPoints: number
  pendingInvitationsCount: number
  activeTab?: "home" | "completed"
}

export default function DashboardHeader({ 
  user, 
  totalPoints, 
  pendingInvitationsCount,
  activeTab 
}: DashboardHeaderProps) {
  return (
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
          <Link href="/dashboard/profile" className="flex items-center gap-3 hover:opacity-80">
            <Image
              src={user.image || "/logo.png"}
              alt={user.name || "Profile"}
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {user.name || user.email}
            </span>
          </Link>
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
            href="/dashboard/profile"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Profile 
          </Link>
          <Link
            href="/dashboard/invitations"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline relative"
          >
            Invitations
            {pendingInvitationsCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingInvitationsCount}
              </span>
            )}
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

      {/* Tab Navigation */}
      {activeTab && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <Link
              href="/dashboard"
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "home"
                  ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              }`}
            >
              Home
            </Link>
            <Link
              href="/dashboard/completed"
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "completed"
                  ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              }`}
            >
              Completed
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
