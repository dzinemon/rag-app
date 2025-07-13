/**
 * Main exports for RAG system abstractions
 * Provides a unified entry point for all types and client initializers
 */

// Export all types
export * from './types';

// Export client initializers
export * from './clients/llm';
export * from './clients/embedding';
export * from './clients/pinecone';

// Re-export commonly used types for convenience
export type {
  IEmbeddingService,
  IVectorStoreService,
  Vector,
  VectorMatch,
  VectorQuery,
  EmbeddingConfig,
  VectorStoreConfig,
  Metadata,
  MetadataValue,
  ConversationMessage,
} from './types';

export type {
  ChatConfig,
  OpenAIChatConfig,
  PerplexityChatConfig,
  ChatError,
} from './clients/llm';

export type {
  OpenAIEmbeddingConfig,
} from './clients/embedding';

export type {
  PineconeConfig,
} from './clients/pinecone';
