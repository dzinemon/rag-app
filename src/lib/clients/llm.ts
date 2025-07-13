/**
 * LLM client initialization for chat completions
 * Supports OpenAI and Perplexity providers
 */

import { ChatOpenAI } from '@langchain/openai';
import { AI_CONFIG, PROVIDER_CONFIG } from '../../config/app';

// Chat provider configuration
export interface ChatConfig {
  provider: 'openai' | 'perplexity';
  apiKey: string;
  model?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

// OpenAI chat configuration
export interface OpenAIChatConfig extends ChatConfig {
  provider: 'openai';
  organization?: string;
}

// Perplexity chat configuration
export interface PerplexityChatConfig extends ChatConfig {
  provider: 'perplexity';
  baseURL?: 'https://api.perplexity.ai';
}

export class ChatError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ChatError';
  }
}

/**
 * Get chat configuration from environment variables
 * Throws error if required environment variables are missing
 */
export function getDefaultChatConfig(): ChatConfig {
  const provider = PROVIDER_CONFIG.chatProvider as 'openai' | 'perplexity';
  
  switch (provider) {
    case 'openai':
      return {
        provider: 'openai',
        apiKey: AI_CONFIG.openaiApiKey,
        model: AI_CONFIG.openaiChatModel,
      };
    
    case 'perplexity':
      return {
        provider: 'perplexity',
        apiKey: AI_CONFIG.perplexityApiKey,
        model: AI_CONFIG.perplexityChatModel,
        baseURL: 'https://api.perplexity.ai',
      };
    
    default:
      throw new ChatError(`Unsupported chat provider: ${provider}`);
  }
}

/**
 * Initialize chat LLM with configuration validation
 * @param config - Chat provider configuration (optional, uses defaults from env)
 * @returns Initialized ChatOpenAI instance
 */
export function initializeChatLLM(config?: Partial<ChatConfig>): ChatOpenAI {
  const defaultConfig = getDefaultChatConfig();
  const finalConfig = { ...defaultConfig, ...config };
  
  // Validate API key
  if (!finalConfig.apiKey) {
    throw new ChatError(`API key is required for ${finalConfig.provider} provider`);
  }
  
  switch (finalConfig.provider) {
    case 'openai':
      return initializeOpenAIChatLLM(finalConfig as OpenAIChatConfig);
    
    case 'perplexity':
      return initializePerplexityChatLLM(finalConfig as PerplexityChatConfig);
    
    default:
      throw new ChatError(`Unsupported chat provider: ${finalConfig.provider}`);
  }
}

/**
 * Initialize OpenAI chat LLM
 */
function initializeOpenAIChatLLM(config: OpenAIChatConfig): ChatOpenAI {
  return new ChatOpenAI({
    modelName: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    openAIApiKey: config.apiKey,
    ...(config.organization && { 
      configuration: { organization: config.organization } 
    }),
  });
}

/**
 * Initialize Perplexity chat LLM
 */
function initializePerplexityChatLLM(config: PerplexityChatConfig): ChatOpenAI {
  return new ChatOpenAI({
    modelName: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    openAIApiKey: config.apiKey,
    configuration: {
      baseURL: config.baseURL || 'https://api.perplexity.ai',
    },
  });
}

// Re-export ChatOpenAI for compatibility
export { ChatOpenAI } from '@langchain/openai';
