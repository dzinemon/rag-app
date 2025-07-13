import { requireAuth } from "@/lib/auth-server"
import KnowledgeBaseBrowser from "@/components/knowledge-base/KnowledgeBaseBrowser"

export default async function KnowledgeBasePage() {
  await requireAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Knowledge Base
          </h1>
          <p className="mt-2 text-gray-600">
            Browse and explore documents in our knowledge base. Click on any document to view its contents.
          </p>
        </div>
        
        <KnowledgeBaseBrowser />
      </div>
    </div>
  )
}
