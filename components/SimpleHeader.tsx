import Link from "next/link"
import { ReactNode } from "react"

interface BackLink {
  href: string
  label: string
}

interface SimpleHeaderProps {
  title: string
  backLink: BackLink
  children?: ReactNode
}

export default function SimpleHeader({ title, backLink, children }: SimpleHeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {title}
          </h1>
          <div className="flex items-center gap-4">
            {children}
            <Link
              href={backLink.href}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              ← {backLink.label}
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
