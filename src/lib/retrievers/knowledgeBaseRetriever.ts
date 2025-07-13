/**
 * LangChain-compatible Retriever for Knowledge Base
 * Integrates our KnowledgeBaseService with LangChain's Retriever abstraction
 */

import { BaseRetriever } from '@langchain/core/retrievers';
import { Document } from '@langchain/core/documents';
import { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager';
import { KnowledgeBaseService } from '@/services/knowledgeBaseService';
import { Metadata } from '@/lib/types';
import { RAG_CONFIG } from '@/config/app';

export interface KnowledgeBaseRetrieverConfig {
  knowledgeBaseService: KnowledgeBaseService;
  topK?: number;
  threshold?: number;
  filter?: Metadata;
}

/**
 * Custom LangChain Retriever that uses our KnowledgeBaseService
 * Converts our chunk results into LangChain Documents for seamless integration
 */
export class KnowledgeBaseRetriever extends BaseRetriever {
  lc_name = 'KnowledgeBaseRetriever';
  lc_namespace = ['rag-app', 'retrievers'];
  
  private knowledgeBaseService: KnowledgeBaseService;
  private topK: number;
  private threshold: number;
  private filter?: Metadata;

  constructor(config: KnowledgeBaseRetrieverConfig) {
    super();
    
    if (!config.knowledgeBaseService) {
      throw new Error('KnowledgeBaseService is required');
    }
    
    this.knowledgeBaseService = config.knowledgeBaseService;
    this.topK = config.topK ?? RAG_CONFIG.topK;
    this.threshold = config.threshold ?? RAG_CONFIG.threshold;
    this.filter = config.filter;
  }

  /**
   * Retrieve relevant documents for a query
   * This is the main method required by LangChain's BaseRetriever
   */
  async _getRelevantDocuments(
    query: string,
    runManager?: CallbackManagerForRetrieverRun
  ): Promise<Document[]> {
    // Validate query input
    if (!query || query.trim().length === 0) {
      await runManager?.handleText('Empty query provided, returning no documents');
      return [];
    }

    try {
      // Use our knowledge base service to retrieve chunks
      const result = await this.knowledgeBaseService.retrieveChunksForQuery(query, {
        topK: this.topK,
        threshold: this.threshold,
        filter: this.filter,
      });

      // Convert our chunks to LangChain Documents
      const documents = result.chunks.map(chunk => {
        // Bundle context using the 'text' field as specified in milestone 3.1
        const contextText = chunk.text;
        
        return new Document({
          pageContent: contextText,
          metadata: {
            chunkId: chunk.id,
            documentId: chunk.document.id,
            documentTitle: chunk.document.title,
            documentAuthor: chunk.document.author,
            documentType: chunk.document.documentType,
            similarityScore: chunk.score,
            // Include original metadata from vector store
            ...chunk.metadata,
          },
        });
      });

      // Log retrieval results for debugging
      await runManager?.handleText(
        `Retrieved ${documents.length} documents for query: "${query}"`
      );

      return documents;
    } catch (error) {
      const errorMessage = `Failed to retrieve documents for query "${query}": ${error instanceof Error ? error.message : 'Unknown error'}`;
      await runManager?.handleText(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get the current configuration
   */
  getConfig() {
    return {
      topK: this.topK,
      threshold: this.threshold,
      filter: this.filter,
    };
  }

  /**
   * Update retrieval parameters
   */
  updateConfig(config: Partial<KnowledgeBaseRetrieverConfig>) {
    if (config.topK !== undefined) this.topK = config.topK;
    if (config.threshold !== undefined) this.threshold = config.threshold;
    if (config.filter !== undefined) this.filter = config.filter;
  }
}
