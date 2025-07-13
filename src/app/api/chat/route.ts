/**
 * Conversational RAG Chat API Endpoint
 * Handles chat with streaming support and conversational history
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { ConversationalRAGService } from '@/services/convRagService';
import { getConversationalRAGService } from '@/services/conversationalRagSingleton';
import { z } from 'zod';
import { ConversationMessage } from '@/lib';
import { AI_CONFIG } from '@/config/app';

// Request validation schema
const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long'),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })).optional(),
  conversationId: z.string().nullable().optional(),
  useStreaming: z.boolean().default(true),
  maxTokens: z.number().min(100).max(4000).default(AI_CONFIG.maxTokens),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    console.log('📝 Chat API request body:', body);
    
    const parseResult = ChatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      console.error('❌ Validation failed:', parseResult.error.format());
      return new Response(
        JSON.stringify({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: parseResult.error.format(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { message, messages, conversationId, useStreaming, maxTokens } = parseResult.data;

    console.log(`💬 Processing chat message:`, {
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      messagesCount: messages?.length || 0,
      conversationId,
      useStreaming,
      maxTokens,
      userRole: session.user.role,
    });

    // 3. Get the singleton instance of conversational RAG service
    const conversationalRAGService = getConversationalRAGService();

    if (useStreaming) {
      // 4a. Handle streaming response
      return handleStreamingResponse(
        conversationalRAGService,
        message,
        session.user.role,
        conversationId || undefined,
        maxTokens || AI_CONFIG.maxTokens,
        messages
      );
    } else {
      // 4b. Handle non-streaming response
      return handleNonStreamingResponse(
        conversationalRAGService,
        message,
        session.user.role,
        conversationId || undefined,
        maxTokens || AI_CONFIG.maxTokens,
        messages
      );
    }

  } catch (error) {
    console.error('❌ Chat API error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return new Response(
          JSON.stringify({ error: 'Configuration Error', message: 'AI service configuration issue' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (error.message.includes('rate limit')) {
        return new Response(
          JSON.stringify({ error: 'Rate Limit', message: 'Too many requests. Please try again later.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle streaming response
 */
async function handleStreamingResponse(
  conversationalRAGService: ConversationalRAGService,
  message: string,
  userRole: string,
  conversationId: string | undefined,
  maxTokens: number,
  messages?: ConversationMessage[]
) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log(`🔄 Starting streaming response for: "${message}"`);
        
        // Send initial metadata
        const startMetadata = {
          type: 'start',
          conversationId: conversationId || generateConversationId(),
          timestamp: new Date().toISOString(),
          userRole,
          maxTokens,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(startMetadata)}\n\n`));

        // Process with conversational RAG
        const response = await conversationalRAGService.processMessage({
          message,
          userRole,
          conversationId,
          maxTokens,
          messages
        });

        console.log(`✅ Response generated with tool: ${response.toolUsed}`);

        // Send service metadata
        const serviceMetadata = {
          type: 'service',
          toolUsed: response.toolUsed,
          hasSourceDocuments: response.sourceDocuments && response.sourceDocuments.length > 0,
          timestamp: new Date().toISOString(),
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(serviceMetadata)}\n\n`));

        // Stream the response text in chunks
        const responseText = response.message;
        const words = responseText.split(' ');
        
        for (let i = 0; i < words.length; i++) {
          const chunk = {
            type: 'chunk',
            content: words[i] + (i < words.length - 1 ? ' ' : ''),
            index: i,
            isLast: i === words.length - 1,
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          
          // Small delay to simulate realistic streaming
          await new Promise(resolve => setTimeout(resolve, 30));
        }
        
        // Send completion signal
        const completion = {
          type: 'complete',
          conversationId: response.conversationId,
          totalChunks: words.length,
          metadata: {
            toolUsed: response.toolUsed,
            sourceDocuments: response.sourceDocuments || [],
            usage: response.usage,
            messages: response.messages || []
          },
          timestamp: new Date().toISOString(),
        };
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(completion)}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        
        console.log(`✅ Streaming response completed for conversation: ${response.conversationId}`);
        
      } catch (error) {
        console.error('❌ Streaming error:', error);
        const errorResponse = {
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/**
 * Handle non-streaming response
 */
async function handleNonStreamingResponse(
  conversationalRAGService: ConversationalRAGService,
  message: string,
  userRole: string,
  conversationId: string | undefined,
  maxTokens: number,
  messages?: ConversationMessage[]
) {
  console.log(`💫 Processing non-streaming response for: "${message}"`);
  
  // Process the message using conversational RAG
  const response = await conversationalRAGService.processMessage({
    message,
    userRole,
    conversationId,
    maxTokens,
    messages
  });

  console.log(`✅ Chat response generated with tool: ${response.toolUsed}`);

  // Return structured response
  const responseData = {
    success: true,
    message: response.message,
    conversationId: response.conversationId,
    metadata: {
      toolUsed: response.toolUsed,
      sourceDocuments: response.sourceDocuments || [],
      usage: response.usage,
      messages: response.messages || [],
      maxTokens,
      userRole,
      timestamp: new Date().toISOString(),
    },
  };
  
  return new Response(JSON.stringify(responseData), {
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Generate a unique conversation ID
 */
function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// GET method for health check
export async function GET() {
  return new Response(JSON.stringify({
    status: 'healthy',
    service: 'Conversational RAG Chat API',
    timestamp: new Date().toISOString(),
    features: [
      'Conversation History',
      'Knowledge Base Retrieval',
      'Company Information',
      'Streaming Support',
      'RAG Integration'
    ],
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
