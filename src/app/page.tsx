"use client"

import { useSession } from "next-auth/react"
import Header from "@/components/Header"
import Link from "next/link"
import { BookOpen, MessageCircle, ShieldCheck } from "lucide-react"

export default function Home() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            Welcome to{" "}
            <span className="text-indigo-600">RAG App</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Your AI-powered knowledge base with retrieval-augmented generation capabilities.
          </p>
          
          {session ? (
            <div className="mt-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Link
                      href="/knowledge-base"
                      className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200"
                    >
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-600 ring-4 ring-white">
                          <BookOpen className="h-6 w-6" />
                        </span>
                      </div>
                      <div className="mt-8">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Browse Knowledge Base
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">
                          Explore and search through our collection of documents.
                        </p>
                      </div>
                    </Link>

                    <Link
                      href="/chat"
                      className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200"
                    >
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-600 ring-4 ring-white">
                          <MessageCircle className="h-6 w-6" />
                        </span>
                      </div>
                      <div className="mt-8">
                        <h3 className="text-lg font-medium">
                          <span className="absolute inset-0" aria-hidden="true" />
                          AI Chat ✨
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">
                          Chat with our AI assistant powered by your knowledge base.
                        </p>
                      </div>
                    </Link>

                    {session.user?.role === "ADMIN" && (
                      <Link 
                        href="/admin/knowledge-base"
                        aria-label="Admin Access"
                        className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200"
                      >
                        <div>
                          <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-600 ring-4 ring-white">
                            <ShieldCheck className="h-6 w-6" />
                          </span>
                        </div>
                        <div className="mt-8">
                          <h3 className="text-lg font-medium">
                            <span className="absolute inset-0" aria-hidden="true" />
                            Admin Access 
                          </h3>
                          <p className="mt-2 text-sm text-gray-500">
                            You have administrative privileges to manage the knowledge base.
                          </p>
                        </div>
                      </Link>
                    )}
                  </div>
          
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <Link
                  href="/auth/signup"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                >
                  Get started
                </Link>
              </div>
              <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                <Link
                  href="/auth/signin"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                >
                  Sign in
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
