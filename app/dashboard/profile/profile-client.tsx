"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"

interface ProfileClientProps {
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

export default function ProfileClient({ user: initialUser }: ProfileClientProps) {
  const router = useRouter()
  const [user, setUser] = useState(initialUser)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side validation
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.")
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setError("File too large. Maximum size is 5MB.")
      return
    }

    setError(null)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/user/profile-image", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        router.refresh()
      } else {
        setError(data.error || "Failed to upload image")
      }
    } catch (_err) {
      setError("Something went wrong")
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const imageUrl = user.image || "/logo.png"

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
          <Link
            href="/dashboard"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold mb-6 dark:text-white">Profile Settings</h2>

          {/* Profile Image Section */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Profile Image
            </label>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Image
                  src={imageUrl}
                  alt={user.name || "Profile"}
                  width={100}
                  height={100}
                  className="rounded-full object-cover"
                />
              </div>
              <div className="flex-1">
                <button
                  onClick={handleUploadClick}
                  disabled={uploading}
                  className="bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? "Uploading..." : "Upload New Image"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  JPEG, PNG, GIF, or WebP. Max 5MB.
                </p>
              </div>
            </div>
            {error && (
              <div className="mt-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* User Info Section */}
          <div className="border-t dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Account Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {user.name || "Not set"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
