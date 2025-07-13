import { requireAuth } from "@/lib/auth-server"
import DocumentViewer from "@/components/knowledge-base/DocumentViewer"

interface DocumentPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  await requireAuth()
  
  const resolvedParams = await params

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DocumentViewer documentId={resolvedParams.id} />
      </div>
    </div>
  )
}
