import { requireAuth } from "@/lib/auth-server"
import ChatInterface from "@/components/chat/ChatInterface"

export default async function ChatPage() {
  await requireAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            AI Assistant
          </h1>
          <p className="mt-1 text-gray-600">
            Chat with your knowledge base
          </p>
        </div>
        
        <ChatInterface />
      </div>
    </div>
  )
}
