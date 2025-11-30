import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Link from "next/link"

export default async function Home() {
  console.log("hello world")
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">Choriot</h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">Carry your chores to completion</p>
        <div className="space-x-4">
          <Link
            href="/login"
            className="inline-block bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-block bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 px-6 py-3 rounded-lg border-2 border-indigo-600 dark:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  )
}
