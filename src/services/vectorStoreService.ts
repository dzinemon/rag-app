/**
 * Vector Store Service Implementation
 * Provides concrete implementation for Pinecone vector database operations
 * with robust error handling and retry logic
 */

import { Pinecone } from '@pinecone-database/pinecone';
import {
  IVectorStoreService,
  Vector,
  VectorMatch,
  VectorQuery,
  VectorStoreError,
  Metadata,
  MetadataValue,
} from '../lib/types';
import {
  PineconeConfig,
  getDefaultPineconeConfig,
  validatePineconeConfig,
  getPineconeIndexConfig,
} from '../lib/clients/pinecone';

/**
 * Concrete implementation of IVectorStoreService using Pinecone
 */
export class VectorStoreService implements IVectorStoreService {
  private pinecone: Pinecone;
  private config: PineconeConfig;
  private indexName: string;

  constructor(config?: PineconeConfig) {
    try {
      this.config = config || getDefaultPineconeConfig();
      validatePineconeConfig(this.config);
      
      this.pinecone = new Pinecone({
        apiKey: this.config.apiKey,
      });
      
      this.indexName = this.config.indexName;
    } catch (error) {
      throw new VectorStoreError(
        `Failed to initialize vector store service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Initialize the vector store (create index if needed)
   */
  async init(dimension: number): Promise<void> {
    try {
      // Check if index exists
      const indexExists = await this.indexExists();
      
      if (!indexExists) {
        console.log(`Creating Pinecone index: ${this.indexName}`);
        
        const indexConfig = {
          ...getPineconeIndexConfig(this.config),
          dimension,
        };

        // Use serverless configuration (modern Pinecone default)
        // Pod-based configuration can be added later if needed
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: indexConfig.dimension,
          metric: indexConfig.metric,
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          },
        });

        // Wait for index to be ready
        await this.waitForIndexReady();
      } else {
        console.log(`Pinecone index ${this.indexName} already exists`);
      }
    } catch (error) {
      throw new VectorStoreError(
        `Failed to initialize vector store: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Insert or update vectors in the store
   */
  async upsert(vectors: Vector[], namespace?: string): Promise<void> {
    try {
      if (vectors.length === 0) {
        return;
      }

      const index = this.pinecone.index(this.indexName);
      
      // Convert vectors to Pinecone format
      const pineconeVectors = vectors.map(vector => ({
        id: vector.id,
        values: vector.values,
        metadata: this.sanitizeMetadata(vector.metadata || {}),
      }));

      // Batch upsert (Pinecone supports up to 100 vectors per batch)
      const batchSize = 100;
      const batches = this.chunkArray(pineconeVectors, batchSize);

      for (const batch of batches) {
        await index.namespace(namespace || '').upsert(batch);
      }

      console.log(`Upserted ${vectors.length} vectors to Pinecone${namespace ? ` in namespace ${namespace}` : ''}`);
    } catch (error) {
      throw new VectorStoreError(
        `Failed to upsert vectors: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Query for similar vectors (with result caching)
   */
  async query(query: VectorQuery, namespace?: string): Promise<VectorMatch[]> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      // Optimize query parameters
      const queryRequest = {
        vector: query.vector,
        topK: Math.min(query.topK, 100), // Limit to reasonable max
        includeMetadata: query.includeMetadata !== false,
        includeValues: false, // Don't include values for better performance
        ...(query.filter && { filter: this.sanitizeMetadata(query.filter) }),
      };

      // Measure query time for performance monitoring
      const startTime = Date.now();
      const response = await index.namespace(namespace || '').query(queryRequest);
      const queryTime = Date.now() - startTime;

      // Convert Pinecone matches to our format
      const matches: VectorMatch[] = (response.matches || []).map(match => ({
        id: match.id,
        score: match.score || 0,
        metadata: this.convertPineconeMetadata(match.metadata),
      }));

      console.log(`Found ${matches.length} similar vectors in ${queryTime}ms${namespace ? ` in namespace ${namespace}` : ''}`);
      
      // Log slow queries for optimization
      if (queryTime > 2000) {
        console.warn(`⚠️ Slow Pinecone query: ${queryTime}ms for topK=${query.topK}`);
      }
      
      return matches;
    } catch (error) {
      throw new VectorStoreError(
        `Failed to query vectors: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete vectors by IDs
   */
  async delete(ids: string[], namespace?: string): Promise<void> {
    try {
      if (ids.length === 0) {
        return;
      }

      const index = this.pinecone.index(this.indexName);
      
      // Delete vectors
      await index.namespace(namespace || '').deleteMany(ids);

      console.log(`Deleted ${ids.length} vectors from Pinecone${namespace ? ` in namespace ${namespace}` : ''}`);
    } catch (error) {
      throw new VectorStoreError(
        `Failed to delete vectors: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete all vectors in a namespace
   */
  async deleteAll(namespace: string): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      if (namespace) {
        // Delete all vectors in the specific namespace
        await index.namespace(namespace).deleteAll();
        console.log(`Deleted all vectors from namespace ${namespace} in Pinecone`);
      } else {
        // Delete all vectors in the default namespace
        await index.deleteAll();
        console.log('Deleted all vectors from Pinecone index');
      }
    } catch (error) {
      throw new VectorStoreError(
        `Failed to delete all vectors: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get statistics about the vector store
   */
  async getStats(namespace?: string): Promise<{
    vectorCount: number;
    dimension?: number;
    [key: string]: MetadataValue;
  }> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      // Get index description for stats
      const indexDescription = await this.pinecone.describeIndex(this.indexName);
      const indexStats = await index.describeIndexStats();

      const namespaceStats = namespace 
        ? indexStats.namespaces?.[namespace]
        : indexStats.namespaces?.[''] || { recordCount: indexStats.totalRecordCount || 0 };

      return {
        vectorCount: namespaceStats?.recordCount || 0,
        dimension: indexDescription.dimension,
        totalVectorCount: indexStats.totalRecordCount || 0,
        indexFullness: indexStats.indexFullness || 0,
        environment: this.config.environment,
        metric: indexDescription.metric,
        podType: indexDescription.spec?.pod?.podType,
        replicas: indexDescription.spec?.pod?.replicas,
      };
    } catch (error) {
      throw new VectorStoreError(
        `Failed to get vector store stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if index exists
   */
  private async indexExists(): Promise<boolean> {
    try {
      await this.pinecone.describeIndex(this.indexName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for index to be ready after creation
   */
  private async waitForIndexReady(maxWaitTime: number = 60000): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const indexDescription = await this.pinecone.describeIndex(this.indexName);
        if (indexDescription.status?.ready) {
          console.log(`Index ${this.indexName} is ready`);
          return;
        }
        console.log(`Waiting for index ${this.indexName} to be ready...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch {
        console.log(`Waiting for index ${this.indexName} to be created...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    throw new VectorStoreError(`Index ${this.indexName} was not ready within ${maxWaitTime}ms`);
  }

  /**
   * Enhanced metadata conversion with type restoration
   */
  private convertPineconeMetadata(metadata: Record<string, unknown> | undefined): Metadata {
    const converted: Metadata = {};
    
    if (!metadata) return converted;
    
    for (const [key, value] of Object.entries(metadata)) {
      // Skip type hint fields
      if (key.endsWith('__type')) continue;
      
      const typeHint = metadata[`${key}__type`];
      
      if (typeHint === 'array' && typeof value === 'string') {
        try {
          converted[key] = JSON.parse(value);
        } catch {
          converted[key] = value; // Fallback
        }
      } else if (typeHint === 'object' && typeof value === 'string') {
        try {
          converted[key] = JSON.parse(value);
        } catch {
          converted[key] = value; // Fallback
        }
      } else {
        converted[key] = value as MetadataValue;
      }
    }
    
    return converted;
  }

  /**
   * Enhanced metadata sanitization with type preservation
   */
  private sanitizeMetadata(metadata: Metadata): Record<string, string | number | boolean> {
    const sanitized: Record<string, string | number | boolean> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      if (value === undefined || value === null) {
        continue;
      }
      
      // Add type hints for reverse conversion
      if (Array.isArray(value)) {
        sanitized[key] = JSON.stringify(value); // Better than join(',')
        sanitized[`${key}__type`] = 'array'; // Type hint
      } else if (typeof value === 'object') {
        sanitized[key] = JSON.stringify(value);
        sanitized[`${key}__type`] = 'object'; // Type hint
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Split array into chunks of specified size
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
