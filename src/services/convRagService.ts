/**
 * Conversational RAG Service
 * Optimized version with better separation of concerns and maintainability
 */

import { BaseMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { initializeChatLLM } from '../lib/clients/llm';
import { KnowledgeBaseRetriever } from '../lib/retrievers/knowledgeBaseRetriever';
import { ChatRequest, ChatResponse, ChunkMetadata, ConversationContext } from '../lib/types';
import { KnowledgeBaseService } from './knowledgeBaseService';
import { AI_CONFIG, RAG_CONFIG } from '../config/app';

// Import optimized utilities and handlers
import { ConversationManager } from '../lib/managers/ConversationManager';
import { CompanyInfoHandler } from '../lib/handlers/CompanyInfoHandler';
import { RAGHandler } from '../lib/handlers/RAGHandler';
import { MessageUtils } from '../lib/utils/MessageUtils';
import { categorizeError } from '../lib/errors/ConversationalRAGErrors';
import { TOOL_NAMES } from '../lib/constants/conversationalRAG';

/**
 * Optimized Conversational RAG Service for chat with knowledge base retrieval
 */
export class ConversationalRAGService {
  private readonly llm: ChatOpenAI;
  private readonly retriever: KnowledgeBaseRetriever;
  private readonly conversationManager: ConversationManager;
  private readonly companyInfoHandler: CompanyInfoHandler;
  private readonly ragHandler: RAGHandler;

  constructor() {
    // Initialize LLM with centralized config
    this.llm = initializeChatLLM({
      temperature: AI_CONFIG.temperature,
      maxTokens: AI_CONFIG.maxTokens,
    });

    // Initialize Knowledge Base retriever with centralized config
    const knowledgeBaseService = new KnowledgeBaseService();
    this.retriever = new KnowledgeBaseRetriever({
      knowledgeBaseService,
      topK: RAG_CONFIG.topK,
      threshold: RAG_CONFIG.threshold,
    });

    // Initialize handlers and managers
    this.conversationManager = new ConversationManager();
    this.companyInfoHandler = new CompanyInfoHandler();
    this.ragHandler = new RAGHandler();
  }

  /**
   * Process a chat message with RAG and conversation history
   */
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const { message, conversationId, userRole } = request;
    
    try {
      // Get or create conversation context
      const conversation = this.conversationManager.getOrCreateConversation(
        conversationId, 
        (userRole || 'USER') as 'USER'
      );
      
      // Update conversation with client messages if provided
      if (request.messages?.length) {
        this.conversationManager.updateConversationHistory(conversation, request.messages);
      }
      
      // Add current user message
      this.conversationManager.addUserMessage(conversation, message);
      
      // Generate response
      const { response, sourceDocuments, toolUsed } = await this.generateResponse(
        message, 
        conversation.messages
      );
      
      // Add assistant response and update conversation
      this.conversationManager.addAssistantMessage(conversation, response);
      
      // Cleanup old conversations
      this.conversationManager.cleanupConversations();
      
      return {
        message: response,
        conversationId: conversation.id,
        sourceDocuments,
        toolUsed,
        messages: MessageUtils.convertToConversationMessages(conversation.messages)
      };
      
    } catch (error) {
      console.error('❌ Failed to process chat message:', error);
      
      // Use centralized error categorization
      if (error instanceof Error) {
        throw categorizeError(error);
      }
      
      throw new Error('Unknown error occurred during chat processing');
    }
  }

  /**
   * Generate response using appropriate handler
   */
  private async generateResponse(
    message: string, 
    messages: BaseMessage[]
  ): Promise<{
    response: string;
    sourceDocuments: Array<{
      chunkId: string;
      documentId: string;
      documentTitle: string;
      content: string;
      similarityScore: number;
      metadata?: ChunkMetadata;
    }>;
    toolUsed: string;
  }> {
    const isCompanyQuestion = this.companyInfoHandler.isCompanyRelatedQuestion(message);
    
    if (isCompanyQuestion) {
      const response = await this.companyInfoHandler.handleCompanyQuestion(message, messages, this.llm);
      return {
        response,
        sourceDocuments: [],
        toolUsed: TOOL_NAMES.COMPANY_INFO
      };
    } else {
      await this.retriever['knowledgeBaseService'].init();
      const ragResult = await this.ragHandler.answerWithRagAndHistory(message, messages, this.retriever, this.llm);
      return {
        response: ragResult.answer,
        sourceDocuments: ragResult.sourceDocuments,
        toolUsed: TOOL_NAMES.RAG_SERVICE
      };
    }
  }

  /**
   * Get conversation history
   */
  getConversation(conversationId: string): ConversationContext | undefined {
    return this.conversationManager.getConversation(conversationId);
  }
  
  /**
   * Clear conversation history
   */
  clearConversation(conversationId: string): boolean {
    return this.conversationManager.clearConversation(conversationId);
  }

  /**
   * Get service statistics
   */
  getStats() {
    return this.conversationManager.getStats();
  }
}
