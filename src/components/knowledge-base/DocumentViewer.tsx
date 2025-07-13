"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface Document {
  id: string
  title: string
  description?: string
  url?: string
  wordCount?: number
  createdAt: string
  updatedAt: string
}

interface Chunk {
  id: string
  chunkText: string
}

interface DocumentViewerProps {
  documentId: string
}

export default function DocumentViewer({ documentId }: DocumentViewerProps) {
  const [document, setDocument] = useState<Document | null>(null)
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [viewMode, setViewMode] = useState<"full" | "chunks">("full")

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true)
        setError("")
        
        // Fetch document details
        const docResponse = await fetch(`/api/knowledge-base/documents/${documentId}`)
        if (!docResponse.ok) {
          throw new Error(`Failed to fetch document: ${docResponse.statusText}`)
        }
        const docData = await docResponse.json()
        setDocument(docData)

        // Fetch document chunks
        const chunksResponse = await fetch(`/api/knowledge-base/documents/${documentId}/chunks`)
        if (!chunksResponse.ok) {
          throw new Error(`Failed to fetch chunks: ${chunksResponse.statusText}`)
        }
        const chunksData = await chunksResponse.json()
        setChunks(chunksData)
      } catch (err) {
        console.error("Error fetching document:", err)
        setError(err instanceof Error ? err.message : "Failed to load document")
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [documentId])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error Loading Document
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <Link
                href="/knowledge-base"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
              >
                Back to Knowledge Base
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-2 text-sm font-medium text-gray-900">Document not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The requested document could not be found.
        </p>
        <div className="mt-6">
          <Link
            href="/knowledge-base"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Back to Knowledge Base
          </Link>
        </div>
      </div>
    )
  }

  const fullText = chunks.map(chunk => chunk.chunkText).join('\n\n')

  return (
    <div className="space-y-6">
      {/* Document Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {document.title}
              </h1>
              {document.description && (
                <p className="mt-1 text-sm text-gray-500">
                  {document.description}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {document.url && (
                <a
                  href={document.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Source
                </a>
              )}
              <Link
                href="/knowledge-base"
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Link>
            </div>
          </div>
          
          <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
            <span className="flex items-center">
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {chunks.length} chunks
            </span>
            {document.wordCount && (
              <span className="flex items-center">
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {document.wordCount.toLocaleString()} words
              </span>
            )}
            <span>Updated {new Date(document.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex space-x-4">
            <button
              onClick={() => setViewMode("full")}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                viewMode === "full"
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Full Document
            </button>
            <button
              onClick={() => setViewMode("chunks")}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                viewMode === "chunks"
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              View by Chunks
            </button>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-6">
          {viewMode === "full" ? (
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {fullText}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {chunks.map((chunk, index) => (
                <div key={chunk.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      Chunk {index + 1}
                    </h3>
                    <span className="text-xs text-gray-500">
                      ID: {chunk.id}
                    </span>
                  </div>
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-700">
                      {chunk.chunkText}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
