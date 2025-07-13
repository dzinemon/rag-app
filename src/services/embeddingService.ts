/**
 * Embedding Service Implementation
 * Provides OpenAI embedding implementation with robust error handling
 * Other providers will be added later
 */

import OpenAI from 'openai';

import {
  IEmbeddingService,
  EmbeddingConfig,
  EmbeddingError,
} from '../lib/types';
import {
  initializeEmbeddingClient,
  getDefaultEmbeddingConfig,
  OpenAIEmbeddingConfig,
} from '../lib/clients/embedding';

/**
 * Concrete implementation of IEmbeddingService
 * Currently supports OpenAI embeddings (other providers will be added later)
 */
export class EmbeddingService implements IEmbeddingService {
  private client: OpenAIEmbeddingConfig;
  private config: EmbeddingConfig;

  constructor(config?: EmbeddingConfig) {
    try {
      this.config = config || getDefaultEmbeddingConfig();
      this.client = initializeEmbeddingClient(this.config);
    } catch (error) {
      throw new EmbeddingError(
        `Failed to initialize embedding service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate embeddings for a single text
   */
  async embedText(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new EmbeddingError('Text cannot be empty');
    }

    const embeddings = await this.embedTexts([text]);
    return embeddings[0];
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedTexts(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      throw new EmbeddingError('Texts array cannot be empty');
    }

    // Validate all texts
    const validTexts = texts.filter(text => text && text.trim().length > 0);
    if (validTexts.length !== texts.length) {
      throw new EmbeddingError('All texts must be non-empty strings');
    }

    return this.embedWithOpenAI(validTexts);
  }

  /**
   * Get the dimension of embeddings produced by this service
   */
  getDimension(): number {
    return this.getOpenAIDimension();
  }

  /**
   * OpenAI embedding implementation (optimized for batch processing)
   */
  private async embedWithOpenAI(texts: string[]): Promise<number[][]> {
    try {
      const openai = new OpenAI({
        apiKey: this.client.apiKey,
      });

      // Batch processing for large text arrays
      const batchSize = 100; // OpenAI's limit for embeddings
      const allEmbeddings: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const startTime = Date.now();

        const response = await openai.embeddings.create({
          input: batch,
          model: this.client.model,
        });

        const requestTime = Date.now() - startTime;
        console.log(`OpenAI embedding batch ${Math.floor(i/batchSize) + 1}: ${batch.length} texts in ${requestTime}ms`);

        if (!response.data || !Array.isArray(response.data)) {
          throw new EmbeddingError('Invalid response format from OpenAI API');
        }

        // Sort by index to maintain order
        const sortedData = response.data.sort((a, b) => a.index - b.index);
        allEmbeddings.push(...sortedData.map(item => item.embedding));

        // Rate limiting: small delay between batches to avoid hitting rate limits
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return allEmbeddings;
    } catch (error) {
      if (error instanceof Error) {
        throw new EmbeddingError(`OpenAI API error: ${error.message}`, error);
      }
      throw new EmbeddingError('Unknown OpenAI API error');
    }
  }

  /**
   * Get OpenAI embedding dimension
   */
  private getOpenAIDimension(): number {
    const model = this.client.model;
    switch (model) {
      case 'text-embedding-3-small':
        return 1536;
      case 'text-embedding-3-large':
        return 3072;
      case 'text-embedding-ada-002':
        return 1536;
      default:
        return 1536; // Default fallback
    }
  }

  /**
   * Get the model name being used by this service
   */
  getModelName(): string {
    return this.config.model || this.client.model;
  }

  /**
   * Get current configuration
   */
  getConfig(): EmbeddingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration and reinitialize client
   */
  updateConfig(newConfig: EmbeddingConfig): void {
    try {
      this.config = newConfig;
      this.client = initializeEmbeddingClient(newConfig);
    } catch (error) {
      throw new EmbeddingError(
        `Failed to update embedding service configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }
}

/**
 * Factory function to create embedding service instances
 */
export function createEmbeddingService(config?: EmbeddingConfig): IEmbeddingService {
  return new EmbeddingService(config);
}

/**
 * Default embedding service instance (singleton)
 */
let defaultService: IEmbeddingService | null = null;

export function getDefaultEmbeddingService(): IEmbeddingService {
  if (!defaultService) {
    defaultService = createEmbeddingService();
  }
  return defaultService;
}

/**
 * Reset the default service (useful for testing)
 */
export function resetDefaultEmbeddingService(): void {
  defaultService = null;
}
