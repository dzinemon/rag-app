/**
 * RAG Handler
 * Manages knowledge base retrieval and RAG response generation
 */

import { BaseMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { formatDocumentsAsString } from 'langchain/util/document';
import { KnowledgeBaseRetriever } from '../retrievers/knowledgeBaseRetriever';
import { ChunkMetadata } from '../types';
import { CONVERSATION_CONSTANTS } from '../constants/conversationalRAG';
import { MessageUtils } from '../utils/MessageUtils';
import { MarkdownProcessor } from '../utils/MarkdownProcessor';

export interface RAGResult {
  answer: string;
  sourceDocuments: Array<{
    chunkId: string;
    documentId: string;
    documentTitle: string;
    content: string;
    similarityScore: number;
    metadata?: ChunkMetadata;
  }>;
}

export class RAGHandler {
  private readonly markdownProcessor: MarkdownProcessor;

  constructor() {
    this.markdownProcessor = new MarkdownProcessor();
  }

  /**
   * Answer a question using RAG with conversation history context
   */
  async answerWithRagAndHistory(
    question: string, 
    messages: BaseMessage[],
    retriever: KnowledgeBaseRetriever,
    llm: ChatOpenAI
  ): Promise<RAGResult> {
    try {
      // Get relevant documents
      const sourceDocuments = await retriever._getRelevantDocuments(question);
      
      // Format documents for the prompt
      const docsText = formatDocumentsAsString(sourceDocuments);
      
      // Create a system message with context and instructions
      const systemPrompt = this.createSystemPrompt(docsText, question);

      // Format messages for the LLM
      const formattedMessages = MessageUtils.formatMessagesForLLM(
        messages, 
        systemPrompt, 
        CONVERSATION_CONSTANTS.MAX_MESSAGE_HISTORY, 
        question
      );
      
      // Call the LLM with the conversation history as messages
      const answer = await llm.call(formattedMessages);
      
      // Format source documents for response
      const sources = sourceDocuments.map(doc => ({
        chunkId: doc.metadata.chunkId,
        documentId: doc.metadata.documentId,
        documentTitle: doc.metadata.documentTitle,
        content: doc.pageContent.substring(0, CONVERSATION_CONSTANTS.CONTENT_TRUNCATE_LENGTH) + '...', // Truncate for display
        similarityScore: doc.metadata.similarityScore || 0,
      }));
      
      return {
        answer: this.markdownProcessor.processMarkdown(answer.text),
        sourceDocuments: sources,
      };
      
    } catch (error) {
      console.error('❌ Failed to answer with RAG:', error);
      throw error;
    }
  }

  private createSystemPrompt(docsText: string, question: string): string {
    return `You are a helpful assistant answering questions based on the provided context.

Knowledge base context:
${docsText}

Instructions:
- Answer the question based on the provided context and conversation history
- If the context doesn't contain enough information, say so clearly
- Be conversational and natural in your response
- If appropriate, reference previous conversation points
- Format your response clearly and professionally using proper markdown
${this.markdownProcessor.generateFormattingInstructions(question)}`;
  }
}
