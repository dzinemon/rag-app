/**
 * Application Configuration
 * Centralized configuration for key app settings
 * All values sourced from environment variables with no fallbacks
 */

// Helper function to get required environment variable
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

// Text Processing & Chunking
export const TEXT_CONFIG = {
  chunkSize: 4000,
  chunkOverlap: 0,
  separators: ['\n\n', '\n', '. ', '? ', '! ', ' ', ''],
};

// AI Configuration (all values from environment)
export const AI_CONFIG = {
  temperature: 0,
  maxTokens: 2048,
  openaiApiKey: getRequiredEnv('OPENAI_API_KEY'),
  openaiEmbeddingModel: getRequiredEnv('OPENAI_EMBEDDING_MODEL'),
  openaiChatModel: getRequiredEnv('OPENAI_CHAT_MODEL'),
  perplexityApiKey: getRequiredEnv('PERPLEXITY_API_KEY'),
  perplexityChatModel: getRequiredEnv('PERPLEXITY_CHAT_MODEL'),
} as const;

// Provider Configuration
export const PROVIDER_CONFIG = {
  embeddingProvider: getRequiredEnv('EMBEDDING_PROVIDER'),
  chatProvider: getRequiredEnv('CHAT_PROVIDER'),
} as const;

// RAG Settings
export const RAG_CONFIG = {
  topK: 5,
  maxContextLength: 8000,
  threshold: 0.01,
} as const;

// Vector Store Configuration
export const VECTOR_CONFIG = {
  provider: 'pinecone',
  apiKey: getRequiredEnv('PINECONE_API_KEY'),
  environment: getRequiredEnv('PINECONE_ENVIRONMENT'),
  indexName: getRequiredEnv('PINECONE_INDEX_NAME'),
  dimension: parseInt(getRequiredEnv('PINECONE_DIMENSION')),
} as const;

// Database Configuration
export const DATABASE_CONFIG = {
  url: getRequiredEnv('DATABASE_URL'),
} as const;

// Auth Configuration
export const AUTH_CONFIG = {
  nextAuthUrl: getRequiredEnv('NEXTAUTH_URL'),
  nextAuthSecret: getRequiredEnv('NEXTAUTH_SECRET'),
  googleClientId: getRequiredEnv('GOOGLE_CLIENT_ID'),
  googleClientSecret: getRequiredEnv('GOOGLE_CLIENT_SECRET'),
  githubClientId: getRequiredEnv('GITHUB_CLIENT_ID'),
  githubClientSecret: getRequiredEnv('GITHUB_CLIENT_SECRET'),
} as const;

// Company Configuration
export const COMPANY_CONFIG = {
  name: getRequiredEnv('COMPANY_NAME'),
  industry: getRequiredEnv('COMPANY_INDUSTRY'),
  email: getRequiredEnv('COMPANY_EMAIL'),
  phone: getRequiredEnv('COMPANY_PHONE'),
} as const;
