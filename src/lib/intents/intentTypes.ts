/**
 * Intent Classification System
 * Defines all supported intents and their mappings to functions/tools
 */

export enum IntentType {
  // Knowledge Base Related
  KNOWLEDGE_BASE_QUERY = 'knowledge_base_query',

  // Calculations & Tools
  TAX_CALCULATOR = 'tax_calculator',

  // Company Information
  ABOUT_COMPANY = 'about_company',
  COMPANY_CONTACT = 'company_contact',

  // Fallback
  UNKNOWN = 'unknown'
}

export interface Intent {
  type: IntentType;
  confidence: number;
  parameters?: Record<string, unknown>;
  requiredRole?: 'USER' | 'ADMIN';
  description: string;
}

export interface IntentPattern {
  type: IntentType;
  keywords: string[];
  patterns: RegExp[];
  examples: string[];
  requiredRole?: 'USER' | 'ADMIN';
  description: string;
}

/**
 * Comprehensive intent patterns for classification
 */
export const INTENT_PATTERNS: IntentPattern[] = [
  // Knowledge Base Queries
  {
    type: IntentType.KNOWLEDGE_BASE_QUERY,
    keywords: [
      'what is', 'explain', 'define', 'how to', 'tutorial', 'guide',
      'rag', 'retrieval', 'vector', 'embedding', 'ai', 'machine learning',
      'nextjs', 'react', 'database', 'postgresql', 'authentication', 'security'
    ],
    patterns: [
      /^(what|how|why|when|where|which)\s+is\s+/i,
      /\b(explain|define|describe|tell me about)\b/i,
      /\b(tutorial|guide|example|documentation)\b/i,
      /\b(implement|create|build|setup|configure)\b/i
    ],
    examples: [
      'What is RAG?',
      'How to implement authentication in Next.js?',
      'Explain vector databases',
      'Tutorial on PostgreSQL setup'
    ],
    description: 'Questions about technical topics in the knowledge base'
  },

  // About Company
  {
    type: IntentType.ABOUT_COMPANY,
    keywords: [
      'about kruze', 'what is kruze', 'tell me about kruze', 'who are you',
      'company', 'startup', 'mission', 'services', 'what do you do',
      'clients served', 'achievements', 'why choose kruze', 'experience'
    ],
    patterns: [
      /\b(about|tell me about|what is)\b.*\b(kruze|company|you)\b/i,
      /\b(who are you|what do you do|your services)\b/i,
      /\b(why choose|why kruze|achievements|clients served)\b/i,
      /\b(mission|vision|experience|track record)\b/i
    ],
    examples: [
      'Tell me about Kruze Consulting',
      'What is your company?',
      'Who are you?',
      'Why choose Kruze Consulting?',
      'What services do you offer?'
    ],
    description: 'Questions about Kruze Consulting company information'
  },

  // Tax Calculator
  {
    type: IntentType.TAX_CALCULATOR,
    keywords: [
      'tax calculator', 'calculate tax', 'tax calculation', 'income tax',
      'corporate tax', 'tax rate', 'tax estimate', 'tax planning'
    ],
    patterns: [
      /\b(tax)\b.*\b(calculator|calculation|compute|estimate)\b/i,
      /\b(calculate|compute)\b.*\b(tax|taxes)\b/i,
      /\b(income tax|corporate tax|tax rate)\b/i
    ],
    examples: [
      'Calculate my tax liability',
      'Tax calculator for startups',
      'Estimate corporate taxes',
      'Income tax calculation'
    ],
    description: 'Tax-related calculations and estimates'
  },

  // Company Contact
  {
    type: IntentType.COMPANY_CONTACT,
    keywords: [
      'contact', 'phone', 'email', 'schedule', 'consultation',
      'get in touch', 'reach out', 'talk to someone', 'meeting'
    ],
    patterns: [
      /\b(contact|phone|email|call|reach)\b/i,
      /\b(schedule|book|consultation|meeting)\b/i,
      /\b(get in touch|talk to|speak with)\b/i
    ],
    examples: [
      'How can I contact you?',
      'Schedule a consultation',
      'What is your phone number?',
      'I want to get in touch'
    ],
    description: 'Contact information and scheduling'
  }
];

/**
 * Intent confidence thresholds
 */
export const INTENT_THRESHOLDS = {
  HIGH_CONFIDENCE: 0.8,
  MEDIUM_CONFIDENCE: 0.6,
  LOW_CONFIDENCE: 0.4,
  MINIMUM_CONFIDENCE: 0.3
} as const;
