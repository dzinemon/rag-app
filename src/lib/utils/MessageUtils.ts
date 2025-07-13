/**
 * Message Utilities
 * Handles message role management and conversion logic
 */

import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { ConversationMessage } from '../types';
import { CONVERSATION_CONSTANTS } from '../constants/conversationalRAG';

export class MessageUtils {
  /**
   * Check if two consecutive roles would be the same
   */
  static isConsecutiveRole(lastRole: string, currentRole: string): boolean {
    return (lastRole === 'user' && currentRole === 'user') || 
           (lastRole === 'assistant' && currentRole === 'assistant');
  }

  /**
   * Get role string from BaseMessage
   */
  static getMessageRole(msg: BaseMessage): string {
    return msg._getType() === 'human' 
      ? 'user' 
      : msg._getType() === 'system'
        ? 'system'
        : 'assistant';
  }

  /**
   * Convert BaseMessages to ConversationMessages
   */
  static convertToConversationMessages(messages: BaseMessage[]): ConversationMessage[] {
    return messages.map(msg => {
      const role = msg._getType() === 'human' 
        ? 'user' 
        : msg._getType() === 'system' 
          ? 'system' 
          : 'assistant';
      
      return {
        role: role as 'user' | 'assistant' | 'system',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      };
    });
  }

  /**
   * Format BaseMessages for LLM calls with role alternation
   */
  static formatMessagesForLLM(
    messages: BaseMessage[], 
    systemPrompt?: string, 
    maxMessages = CONVERSATION_CONSTANTS.MAX_MESSAGE_HISTORY,
    currentQuestion?: string
  ): Array<{ role: string; content: string }> {
    const formattedMessages: Array<{ role: string; content: string }> = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }
    
    if (messages.length > 0) {
      const recentMessages = messages.slice(-maxMessages);
      let lastRole = '';
      
      for (const msg of recentMessages) {
        const role = this.getMessageRole(msg);
        
        // Skip if this would create consecutive messages of the same role
        if (this.isConsecutiveRole(lastRole, role)) {
          console.log(`⚠️ Skipping message to prevent consecutive ${role} messages`);
          continue;
        }
        
        formattedMessages.push({
          role: role,
          content: typeof msg.content === 'string' 
            ? msg.content 
            : JSON.stringify(msg.content)
        });
        
        lastRole = role;
      }
      
      // If the last message is not from a user and we have a current question, add it
      if (currentQuestion && lastRole !== 'user') {
        formattedMessages.push({
          role: 'user',
          content: currentQuestion
        });
      }
    }
    
    return formattedMessages;
  }

  /**
   * Update conversation history with client-provided messages
   */
  static updateConversationMessages(messages: ConversationMessage[]): BaseMessage[] {
    console.log(`🔄 Processing ${messages.length} messages from client`);
    
    const conversationMessages: BaseMessage[] = [];
    let lastRole = '';
    
    for (const msg of messages) {
      // Skip consecutive messages of the same role
      if (this.isConsecutiveRole(lastRole, msg.role)) {
        console.log(`⚠️ Skipping message to prevent consecutive ${msg.role} messages`);
        continue;
      }
      
      if (msg.role === 'user') {
        conversationMessages.push(new HumanMessage(msg.content));
        lastRole = 'user';
      } else if (msg.role === 'assistant') {
        conversationMessages.push(new AIMessage(msg.content));
        lastRole = 'assistant';
      }
    }

    return conversationMessages;
  }

  /**
   * Add user message to conversation, preventing consecutive user messages
   */
  static addUserMessage(messages: BaseMessage[], message: string): BaseMessage[] {
    const lastMessageType = messages.length > 0 
      ? messages[messages.length - 1]._getType() 
      : '';
      
    if (lastMessageType !== 'human') {
      return [...messages, new HumanMessage(message)];
    } else {
      console.log('⚠️ Last message was also from user, replacing instead of adding');
      const newMessages = [...messages];
      newMessages[newMessages.length - 1] = new HumanMessage(message);
      return newMessages;
    }
  }

  /**
   * Add assistant message to conversation
   */
  static addAssistantMessage(messages: BaseMessage[], response: string): BaseMessage[] {
    return [...messages, new AIMessage(response)];
  }
}
