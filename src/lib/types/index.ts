/**
 * Core interfaces for RAG system components
 * These abstractions allow easy swapping of providers in the future
 */
import { BaseMessage } from "@langchain/core/messages";

// Metadata type for flexible key-value pairs
export type MetadataValue = string | number | boolean | null | undefined;
export type Metadata = Record<string, MetadataValue>;

export type ConversationMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  sources?: Array<{
    chunkId: string;
    documentId: string;
    documentTitle: string;
    content: string;
    similarityScore: number;
    metadata?: ChunkMetadata;
  }>;
}

export interface RAGConfig {
  temperature?: number;
  maxTokens?: number;
  topK?: number;
  threshold?: number;
}

export interface ChatResponse {
  message: string;
  conversationId: string;
  messages?: ConversationMessage[];
  sourceDocuments?: Array<{
    chunkId: string;
    documentId: string;
    documentTitle: string;
    content: string;
    similarityScore: number;
    metadata?: ChunkMetadata;
  }>;
  toolUsed?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatRequest {
  message: string;
  messages?: ConversationMessage[];
  conversationId?: string;
  maxTokens?: number;
  userRole?: string;
}

export interface ConversationContext {
  id: string;
  messages: BaseMessage[];
  createdAt: Date;
  updatedAt: Date;
  userRole: string;
}

// Vector representation with metadata
export interface Vector {
  id: string;
  values: number[];
  metadata?: Metadata;
}

// Query result from vector store
export interface VectorMatch {
  id: string;
  score: number;
  metadata?: Metadata;
}

// Query parameters for vector search
export interface VectorQuery {
  vector: number[];
  topK: number;
  filter?: Metadata;
  includeMetadata?: boolean;
}

// Embedding service interface
export interface IEmbeddingService {
  /**
   * Generate embeddings for a single text
   * @param text - The text to embed
   * @returns Promise resolving to embedding vector
   */
  embedText(text: string): Promise<number[]>;

  /**
   * Generate embeddings for multiple texts
   * @param texts - Array of texts to embed
   * @returns Promise resolving to array of embedding vectors
   */
  embedTexts(texts: string[]): Promise<number[][]>;

  /**
   * Get the dimension of embeddings produced by this service
   * @returns The embedding dimension
   */
  getDimension(): number;
}

// Vector store service interface
export interface IVectorStoreService {
  /**
   * Initialize the vector store (create index if needed)
   * @param dimension - Dimension of vectors to store
   * @param metadata - Optional configuration metadata
   */
  init(dimension: number, metadata?: Metadata): Promise<void>;

  /**
   * Insert or update vectors in the store
   * @param vectors - Array of vectors to upsert
   * @param namespace - Optional namespace for organization
   */
  upsert(vectors: Vector[], namespace?: string): Promise<void>;

  /**
   * Query for similar vectors
   * @param query - Query parameters
   * @param namespace - Optional namespace to search in
   * @returns Promise resolving to matching vectors
   */
  query(query: VectorQuery, namespace?: string): Promise<VectorMatch[]>;

  /**
   * Delete vectors by IDs
   * @param ids - Array of vector IDs to delete
   * @param namespace - Optional namespace
   */
  delete(ids: string[], namespace?: string): Promise<void>;

  /**
   * Delete all vectors in a namespace
   * @param namespace - Namespace to clear
   */
  deleteAll(namespace?: string): Promise<void>;

  /**
   * Get statistics about the vector store
   * @param namespace - Optional namespace
   * @returns Statistics object
   */
  getStats(namespace?: string): Promise<{
    vectorCount: number;
    dimension?: number;
    [key: string]: MetadataValue;
  }>;
}

// Configuration types
export interface EmbeddingConfig {
  provider: "openai" | "cohere" | "huggingface" | string;
  model?: string;
  apiKey?: string;
  [key: string]: MetadataValue;
}

export interface VectorStoreConfig {
  provider: "pinecone" | "chroma" | "weaviate" | string;
  apiKey?: string;
  environment?: string;
  indexName?: string;
  [key: string]: MetadataValue;
}

// Error types
export class EmbeddingError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "EmbeddingError";
  }
}

export class VectorStoreError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "VectorStoreError";
  }
}

// Knowledge base types
export interface DocumentMetadata {
  title?: string;
  source?: string;
  author?: string;
  createdAt?: Date;
  tags?: string[];
  [key: string]: MetadataValue | Date | string[];
}

export interface ChunkMetadata extends DocumentMetadata {
  chunkId: string;
  documentId: string;
  chunkIndex: number;
  startChar?: number;
  endChar?: number;
}

export interface DocumentCreateInput {
  title: string;
  content?: string; // Optional when URL is provided
  url?: string; // Optional URL input
  sourceUrl?: string; // For metadata/reference
  filePath?: string;
  author?: string;
  publicationDate?: Date;
  documentType?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  selectorsToIgnore?: string[]; // For web content filtering
}

export interface DocumentWithChunks {
  id: string;
  title: string;
  author?: string | null;
  documentType?: string | null;
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  sourceUrl?: string | null;
  chunks: {
    id: string;
    chunkText: string;
    chunkNumber?: number | null;
    startOffset?: number | null;
    endOffset?: number | null;
    embeddingModelName: string;
  }[];
}

export interface QueryResult {
  chunks: {
    id: string;
    text: string;
    score: number;
    metadata: Metadata;
    document: {
      id: string;
      title: string;
      author?: string | null;
      documentType?: string | null;
    };
  }[];
  query: string;
  totalResults: number;
}

export interface Document {
  id: string;
  title: string;
  author?: string;
  documentType?: string;
  tags: string[];
  chunksCount: number;
  createdAt: string;
  updatedAt: string;
  sourceUrl?: string;
}

export interface IngestionResult {
  success: boolean;
  message: string;
  document?: Document;
  documents?: Document[];
  totalDocuments?: number;
  errors?: Array<{
    url: string;
    error: string;
    status: 'failed';
  }>;
}
