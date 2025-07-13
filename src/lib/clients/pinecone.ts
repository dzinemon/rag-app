/**
 * Pinecone client initialization and configuration
 * Provides a unified interface for Pinecone vector database operations
 */

import { VectorStoreConfig, VectorStoreError } from '../types';
import { VECTOR_CONFIG } from '../../config/app';

// Pinecone-specific configuration
export interface PineconeConfig extends VectorStoreConfig {
  provider: 'pinecone';
  apiKey: string;
  environment?: string;
  indexName: string;
  dimension?: number;
  metric?: 'cosine' | 'euclidean' | 'dotproduct';
  pods?: number;
  replicas?: number;
  podType?: string;
}

/**
 * Get default Pinecone configuration from environment variables
 */
export function getDefaultPineconeConfig(): PineconeConfig {
  return {
    provider: 'pinecone',
    apiKey: VECTOR_CONFIG.apiKey,
    indexName: VECTOR_CONFIG.indexName,
    environment: VECTOR_CONFIG.environment,
    dimension: VECTOR_CONFIG.dimension,
    metric: 'cosine',
  };
}

/**
 * Validate Pinecone configuration
 */
export function validatePineconeConfig(config: PineconeConfig): void {
  if (!config.apiKey) {
    throw new VectorStoreError('Pinecone API key is required');
  }

  if (!config.indexName) {
    throw new VectorStoreError('Pinecone index name is required');
  }

  // Add dimension validation for common embedding dimensions
  if (config.dimension && ![384, 768, 1536, 3072].includes(config.dimension)) {
    console.warn(`Unusual embedding dimension: ${config.dimension}. Common dimensions are 384, 768, 1536, 3072`);
  }

  // Let Pinecone SDK handle format validation - it knows the current formats better than we do
}

/**
 * Generate Pinecone index configuration for creation
 * Supports both serverless (default) and pod-based configurations
 */
export function getPineconeIndexConfig(config: PineconeConfig) {
  const baseConfig = {
    name: config.indexName,
    dimension: config.dimension || 1536,
    metric: config.metric || 'cosine',
  };
  // Default to serverless configuration (modern Pinecone)
  return baseConfig;
}

/**
 * Check if Pinecone configuration is valid
 */
export function isPineconeConfigValid(config: VectorStoreConfig): config is PineconeConfig {
  try {
    validatePineconeConfig(config as PineconeConfig);
    return true;
  } catch (error) {
    console.error('Pinecone configuration validation failed:', error);
    return false;
  }
}

/**
 * Create namespace for organizing vectors by document and user
 * Note: Your current RAG implementation uses default namespace
 * @param documentId - Unique document identifier
 * @param userId - Optional user identifier for user-specific namespaces
 * @returns Formatted namespace string
 */
export function createNamespace(documentId: string, userId?: string): string {
  const base = `doc-${documentId}`;
  return userId ? `${base}-user-${userId}` : base;
}

/**
 * Parse namespace to extract document and user IDs
 * @param namespace - Namespace string to parse
 * @returns Object containing extracted documentId and userId
 */
export function parseNamespace(namespace: string): { documentId?: string; userId?: string } {
  const match = namespace.match(/^doc-(.+?)(?:-user-(.+))?$/);
  if (!match) {
    return {};
  }

  return {
    documentId: match[1],
    userId: match[2],
  };
}

/**
 * Check if namespace-based organization is recommended
 * @param totalDocuments - Total number of documents in the system
 * @param multiTenant - Whether the system supports multiple users/tenants
 * @returns Whether namespace organization would be beneficial
 */
export function shouldUseNamespaces(totalDocuments: number, multiTenant: boolean = false): boolean {
  // Recommend namespaces for large document collections or multi-tenant systems
  return totalDocuments > 1000 || multiTenant;
}
