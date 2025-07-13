/**
 * Specific error types for Conversational RAG Service
 * Provides better error categorization and handling
 */

export class ConversationalRAGError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ConversationalRAGError';
  }
}

export class AuthenticationError extends ConversationalRAGError {
  constructor(message = 'Authentication failed. Please check your API configuration.') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends ConversationalRAGError {
  constructor(message = 'Service temporarily unavailable due to rate limits. Please try again in a moment.') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends ConversationalRAGError {
  constructor(message = 'Network error occurred. Please check your connection and try again.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ConversationNotFoundError extends ConversationalRAGError {
  constructor(conversationId: string) {
    super(`Conversation ${conversationId} not found in memory`);
    this.name = 'ConversationNotFoundError';
  }
}

/**
 * Categorizes errors based on error message content
 */
export function categorizeError(error: Error): ConversationalRAGError {
  const message = error.message.toLowerCase();
  
  if (message.includes('api key') || message.includes('authentication')) {
    return new AuthenticationError();
  }
  
  if (message.includes('rate limit') || message.includes('quota')) {
    return new RateLimitError();
  }
  
  if (message.includes('network') || message.includes('timeout')) {
    return new NetworkError();
  }
  
  return new ConversationalRAGError(
    `Chat processing failed: ${error.message}`,
    error
  );
}
