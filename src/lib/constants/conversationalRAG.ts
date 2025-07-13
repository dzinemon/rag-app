/**
 * Constants for Conversational RAG Service
 * Centralized configuration values to improve maintainability
 */

export const CONVERSATION_CONSTANTS = {
  MAX_CONVERSATIONS: 100,
  MAX_MESSAGE_HISTORY: 6,
  CONTENT_TRUNCATE_LENGTH: 200,
  DEFAULT_USER_ROLE: 'USER',
} as const;

export const COMPANY_KEYWORDS = [
  'consulting', 'company', 'services', 'about you',
  'who are you', 'what do you do', 'your company', 'your services',
  'contact', 'schedule', 'appointment', 'phone', 'email'
] as const;

export const FORMATTING_KEYWORDS = {
  TABLE: ['compare', 'comparison', 'vs', 'difference', 'benefits', 'advantages', 'pros and cons', 'summary table'],
  LIST: ['steps', 'process', 'how to', 'checklist', 'requirements', 'factors', 'types of'],
} as const;

export const TOOL_NAMES = {
  COMPANY_INFO: 'CompanyInfo',
  RAG_SERVICE: 'RAGService',
} as const;
