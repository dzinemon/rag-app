/**
 * Embedding client initialization
 * Supports OpenAI embeddings (other providers will be added later)
 */

import { EmbeddingConfig, EmbeddingError } from '../types';
import { AI_CONFIG, PROVIDER_CONFIG } from '../../config/app';

// OpenAI embedding configuration
export interface OpenAIEmbeddingConfig extends EmbeddingConfig {
  provider: 'openai';
  model: string;
  apiKey: string;
}

/**
 * Initialize embedding client based on configuration
 * @param config - OpenAI embedding configuration
 * @returns Initialized client configuration
 */
export function initializeEmbeddingClient(config: EmbeddingConfig): OpenAIEmbeddingConfig {
  if (!config.provider) {
    throw new EmbeddingError('Provider is required in embedding configuration');
  }

  return initializeOpenAIEmbeddingClient(config as OpenAIEmbeddingConfig);
}

/**
 * Initialize OpenAI embedding client
 */
function initializeOpenAIEmbeddingClient(config: OpenAIEmbeddingConfig): OpenAIEmbeddingConfig {
  if (!config.apiKey) {
    throw new EmbeddingError('OpenAI API key is required');
  }

  if (!config.model) {
    throw new EmbeddingError('OpenAI embedding model is required');
  }

  return {
    provider: 'openai',
    model: config.model,
    apiKey: config.apiKey,
  };
}

/**
 * Get OpenAI embedding configuration from environment variables
 * Throws error if required environment variables are missing
 */
export function getDefaultEmbeddingConfig(): EmbeddingConfig {
  return {
    provider: PROVIDER_CONFIG.embeddingProvider as 'openai',
    apiKey: AI_CONFIG.openaiApiKey,
    model: AI_CONFIG.openaiEmbeddingModel,
  };
}
