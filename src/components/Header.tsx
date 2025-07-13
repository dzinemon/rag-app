"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"

export default function Header() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-gray-900">
              RAG App
            </Link>
            <div className="text-sm text-gray-500">Loading...</div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-gray-900">
            RAG App
          </Link>
          
          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <div className="flex items-center space-x-6">
                  <Link
                    href="/chat"
                    className="text-sm text-purple-700 hover:text-purple-900 font-medium"
                  >
                    Chat ✨
                  </Link>
                  <Link
                    href="/knowledge-base"
                    className="text-sm text-gray-700 hover:text-gray-900"
                  >
                    Knowledge Base
                  </Link>
                  {session.user?.role === "ADMIN" && (
                    <Link
                      href="/admin"
                      className="text-sm text-blue-700 hover:text-blue-900 font-medium"
                    >
                      Admin
                    </Link>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-700">
                    Welcome, {session.user?.name || session.user?.email}
                  </span>
                  {session.user?.role === "ADMIN" && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Admin
                    </span>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="space-x-4">
                <Link
                  href="/auth/signin"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
