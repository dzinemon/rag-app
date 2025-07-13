/**
 * Conversation Manager
 * Handles conversation storage, lifecycle, and management
 */

import { ConversationContext, ConversationMessage } from '../types';
import { CONVERSATION_CONSTANTS } from '../constants/conversationalRAG';
import { MessageUtils } from '../utils/MessageUtils';

export class ConversationManager {
  private conversations: Map<string, ConversationContext> = new Map();

  /**
   * Get existing conversation or create a new one
   */
  getOrCreateConversation(conversationId?: string, userRole = CONVERSATION_CONSTANTS.DEFAULT_USER_ROLE): ConversationContext {
    const convId = conversationId || this.generateConversationId();
    let conversation = this.conversations.get(convId);
    
    if (!conversation) {
      if (conversationId) {
        console.warn(`⚠️ Conversation ID ${conversationId} provided but not found in memory. Creating new conversation.`);
      }
      
      conversation = {
        id: convId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        userRole,
      };
      this.conversations.set(convId, conversation);
      console.log(`🆕 Created new conversation with ID: ${convId}`);
    } else {
      console.log(`✅ Found existing conversation with ID: ${convId}, message count: ${conversation.messages.length}`);
    }
    
    return conversation;
  }

  /**
   * Update conversation with client-provided messages
   */
  updateConversationHistory(conversation: ConversationContext, messages: ConversationMessage[]): void {
    conversation.messages = MessageUtils.updateConversationMessages(messages);
  }

  /**
   * Add user message to conversation
   */
  addUserMessage(conversation: ConversationContext, message: string): void {
    conversation.messages = MessageUtils.addUserMessage(conversation.messages, message);
  }

  /**
   * Add assistant message to conversation
   */
  addAssistantMessage(conversation: ConversationContext, response: string): void {
    conversation.messages = MessageUtils.addAssistantMessage(conversation.messages, response);
    conversation.updatedAt = new Date();
  }

  /**
   * Get conversation by ID
   */
  getConversation(conversationId: string): ConversationContext | undefined {
    return this.conversations.get(conversationId);
  }
  
  /**
   * Clear conversation history
   */
  clearConversation(conversationId: string): boolean {
    return this.conversations.delete(conversationId);
  }

  /**
   * Clean up old conversations (keep last MAX_CONVERSATIONS)
   */
  cleanupConversations(): void {
    if (this.conversations.size > CONVERSATION_CONSTANTS.MAX_CONVERSATIONS) {
      const oldestKey = Array.from(this.conversations.keys())[0];
      if (oldestKey) {
        this.conversations.delete(oldestKey);
        console.log(`🧹 Cleaned up old conversation: ${oldestKey}`);
      }
    }
  }

  /**
   * Get conversation statistics
   */
  getStats(): { totalConversations: number; totalMessages: number } {
    const totalMessages = Array.from(this.conversations.values())
      .reduce((sum, conv) => sum + conv.messages.length, 0);
    
    return {
      totalConversations: this.conversations.size,
      totalMessages,
    };
  }

  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
