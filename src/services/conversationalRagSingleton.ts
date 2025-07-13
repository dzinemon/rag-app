/**
 * Conversational RAG Service Singleton
 * Provides a single instance of the ConversationalRAGService to maintain conversation state
 */

import { ConversationalRAGService } from './convRagService';

// Singleton instance
let instance: ConversationalRAGService | null = null;

/**
 * Get the singleton instance of ConversationalRAGService
 */
export function getConversationalRAGService(): ConversationalRAGService {
  if (!instance) {
    instance = new ConversationalRAGService();
    console.log('Created new ConversationalRAGService singleton instance');
  }
  return instance;
}

/**
 * Reset the singleton instance (primarily for testing)
 * @returns void
 */
export function resetConversationalRAGService(): void {
  if (instance) {
    console.log('Resetting ConversationalRAGService singleton instance');
  }
  instance = null;
}
