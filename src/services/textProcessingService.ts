/**
 * Text Processing Service
 * Centralized text processing utilities using app configuration
 */

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { TEXT_CONFIG } from '../config/app';

export interface TextChunk {
  text: string;
  metadata: {
    chunkIndex: number;
    startChar: number;
    endChar: number;
    totalChunks?: number;
  };
}

/**
 * Chunk text using centralized configuration
 */
export async function chunkText(text: string): Promise<TextChunk[]> {
  // Preprocess the text first
  const cleanText = preprocessText(text);
  
  if (!cleanText.trim()) {
    return [];
  }

  // Use LangChain's text splitter with centralized config
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: TEXT_CONFIG.chunkSize,
    chunkOverlap: TEXT_CONFIG.chunkOverlap,
    separators: TEXT_CONFIG.separators,
  });

  const chunks = await splitter.createDocuments([cleanText]);
  
  // Track positions for accurate metadata
  let currentPos = 0;
  return chunks.map((chunk, index) => {
    const chunkStart = currentPos;
    const chunkEnd = currentPos + chunk.pageContent.length;
    currentPos = chunkEnd;
    
    return {
      text: chunk.pageContent,
      metadata: {
        chunkIndex: index,
        startChar: chunkStart,
        endChar: chunkEnd,
        totalChunks: chunks.length,
      },
    };
  });
}

/**
 * Preprocess text to clean it up
 */
export function preprocessText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ')        // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n')  // Limit line breaks
    .trim();
}