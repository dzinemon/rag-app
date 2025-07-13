/**
 * Knowledge Base Service
 * Combines embedding and vector store services for complete document ingestion pipeline
 */

import { Prisma, PrismaClient, Document as PrismaDocument, Chunk as PrismaChunk } from '@prisma/client';
import { DocumentCreateInput, DocumentWithChunks, Metadata, QueryResult, Vector } from '../lib/types';
import { EmbeddingService } from './embeddingService';
import { createCacheKey, performanceService } from './performanceService';
import { chunkText, TextChunk } from './textProcessingService';
import { VectorStoreService } from './vectorStoreService';
import { WebContentService } from './webContentService';
import { RAG_CONFIG } from '../config/app';


/**
 * Knowledge Base Service for document ingestion and retrieval
 */
export class KnowledgeBaseService {
  private prisma: PrismaClient;
  private vectorStore: VectorStoreService;
  private embeddingService: EmbeddingService;
  private webContentService: WebContentService;

  constructor(
    prisma?: PrismaClient,
    vectorStore?: VectorStoreService,
    embeddingService?: EmbeddingService,
    webContentService?: WebContentService
  ) {
    this.prisma = prisma || new PrismaClient();
    this.vectorStore = vectorStore || new VectorStoreService();
    this.embeddingService = embeddingService || new EmbeddingService();
    this.webContentService = webContentService || new WebContentService();
  }

  /**
   * Initialize the knowledge base (ensure vector store is ready)
   */
  async init(): Promise<void> {
    try {
      const dimension = this.embeddingService.getDimension();
      await this.vectorStore.init(dimension);
      console.log('✅ Knowledge base initialized successfully');
    } catch (error) {
      throw new Error(
        `Failed to initialize knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Add a document to the knowledge base
   * Supports both direct content input and URL-based content loading
   */
  async addDocument(input: DocumentCreateInput): Promise<DocumentWithChunks> {
    console.log(`📄 Adding document: ${input.title}`);

    // Validate input - must have either content or URL
    if (!input.content && !input.url) {
      throw new Error('Document must have either content or URL specified');
    }

    try {
      let finalContent: string;
      let finalSourceUrl = input.sourceUrl;
      let additionalMetadata: Record<string, unknown> = {};

      // 1. Determine content source and load content (OUTSIDE transaction)
      if (input.url) {
        console.log(`🌐 Loading content from URL: ${input.url}`);
        
        const webResult = await this.webContentService.loadWebContent(
          input.url,
          { selectorsToIgnore: input.selectorsToIgnore }
        );
        
        finalContent = webResult.content;
        finalSourceUrl = input.url; // Set the URL as the source
        additionalMetadata = {
          ...additionalMetadata,
          webMetadata: webResult.metadata,
          loadedFromUrl: true,
        };

        // If no title provided, use the one extracted from web content
        if (!input.title.trim() || input.title === 'Untitled') {
          input.title = webResult.metadata.title || input.title;
        }
      } else {
        finalContent = input.content!; // We know content exists due to validation above
      }

      // 2. Chunk the document content (OUTSIDE transaction)
      const chunks = await chunkText(finalContent);
      console.log(`📝 Document chunked into ${chunks.length} pieces`);

      // 3. Generate embeddings for all chunks (OUTSIDE transaction)
      const chunkTexts = chunks.map(chunk => chunk.text);
      const embeddings = await this.embeddingService.embedTexts(chunkTexts);
      console.log(`🧮 Generated embeddings for ${embeddings.length} chunks`);

      // 4. Start a transaction for database operations only (with extended timeout)
      const result = await this.prisma.$transaction(async (tx) => {
        // Create document record in PostgreSQL
        const document = await tx.document.create({
          data: {
            title: input.title,
            sourceUrl: finalSourceUrl,
            filePath: input.filePath,
            author: input.author,
            publicationDate: input.publicationDate,
            documentType: input.documentType,
            tags: input.tags || [],
            metadata: {
              ...input.metadata,
              ...additionalMetadata,
            } as Prisma.InputJsonValue,
          },
        });

        try {
          // 5. Save chunks to PostgreSQL and prepare vectors for Pinecone
          const vectors: Vector[] = [];
          const chunkRecords = [];

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = embeddings[i];

            // Save chunk to PostgreSQL
            const chunkRecord = await tx.chunk.create({
              data: {
                documentId: document.id,
                chunkText: chunk.text,
                chunkNumber: chunk.metadata.chunkIndex,
                startOffset: chunk.metadata.startChar,
                endOffset: chunk.metadata.endChar,
                embeddingModelName: this.embeddingService.getModelName(),
              },
            });

            chunkRecords.push(chunkRecord);

            // Prepare vector for Pinecone
            vectors.push({
              id: chunkRecord.id,
              values: embedding,
              metadata: {
                documentId: document.id,
                chunkId: chunkRecord.id,
                chunkIndex: chunk.metadata.chunkIndex,
                title: input.title,
                author: input.author,
                documentType: input.documentType,
                tags: input.tags?.join(',') || '',
                text: chunk.text.substring(0, 1000), // Store snippet for display
              },
            });
          }

          return { document, chunkRecords, vectors };

        } catch (error) {
          // If chunk operations fail, delete the document
          await tx.document.delete({ where: { id: document.id } });
          throw error;
        }
      }, {
        timeout: 30000, // 30 seconds timeout for database operations
      });

      // 5. Complete the ingestion by storing vectors in Pinecone
      return await this.completeDocumentIngestion(result.document, result.chunkRecords, result.vectors);

    } catch (error) {
      console.error('❌ Failed to add document:', error);
      throw new Error(
        `Failed to add document: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Complete the document ingestion by storing vectors in Pinecone
   * This is separated from the main transaction to avoid timeout issues
   */
  private async completeDocumentIngestion(
    document: PrismaDocument,
    chunkRecords: PrismaChunk[],
    vectors: Vector[]
  ): Promise<DocumentWithChunks> {
    try {
      // Store vectors in Pinecone
      await this.vectorStore.upsert(vectors);
      console.log(`🔍 Stored ${vectors.length} vectors in Pinecone`);

      // Return complete document with chunks
      return {
        id: document.id,
        title: document.title,
        author: document.author,
        documentType: document.documentType,
        tags: document.tags,
        metadata: document.metadata as Record<string, unknown>,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        chunks: chunkRecords.map(chunk => ({
          id: chunk.id,
          chunkText: chunk.chunkText,
          chunkNumber: chunk.chunkNumber,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
          embeddingModelName: chunk.embeddingModelName,
        })),
      };
    } catch (vectorError) {
      console.error('❌ Failed to store vectors in Pinecone:', vectorError);
      
      // Clean up the document from PostgreSQL if vector storage fails
      try {
        await this.prisma.document.delete({ where: { id: document.id } });
        console.log('🧹 Cleaned up document from PostgreSQL due to vector storage failure');
      } catch (cleanupError) {
        console.error('❌ Failed to cleanup document after vector storage failure:', cleanupError);
      }
      
      throw new Error(`Failed to store document vectors: ${vectorError instanceof Error ? vectorError.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve chunks for a query using RAG (with intelligent caching)
   */
  async retrieveChunksForQuery(
    query: string,
    options: {
      topK?: number;
      filter?: Metadata;
      threshold?: number;
    } = {}
  ): Promise<QueryResult> {
    const { topK = RAG_CONFIG.topK, filter, threshold = RAG_CONFIG.threshold } = options;

    console.log(`🔍 Retrieving chunks for query: "${query}"`);

    // Create cache key for this query
    const cacheKey = createCacheKey(
      'query',
      query.toLowerCase().trim(),
      topK.toString(),
      filter ? JSON.stringify(filter) : 'nofilter',
      threshold.toString()
    );

    // Try to get cached result first
    const cached = performanceService.get<QueryResult>(cacheKey);
    if (cached) {
      console.log(`📚 Cache hit for query retrieval`);
      return cached;
    }

    const startTime = Date.now();

    try {
      // 1. Generate embedding for the query
      const queryEmbedding = await this.embeddingService.embedText(query);

      // 2. Search for similar vectors in Pinecone
      const matches = await this.vectorStore.query({
        vector: queryEmbedding,
        topK: Math.min(topK, 20), // Reasonable limit
        filter,
        includeMetadata: true,
      });

      const queryTime = Date.now() - startTime;
      console.log(`Found ${matches.length} vectors in Pinecone in ${queryTime}ms with scores: ${matches.map(m => m.score.toFixed(3)).join(', ')}`);
      console.log(JSON.stringify(matches, null, 2));
      // 3. Filter by similarity threshold (apply threshold at this level)
      const relevantMatches = matches.filter(match => match.score >= threshold);
      console.log(`After threshold filtering (${threshold}): ${relevantMatches.length} relevant vectors`);

      // 4. Get chunk details from PostgreSQL for relevant matches
      const chunkIds = relevantMatches.map(match => match.id);
      
      if (chunkIds.length === 0) {
        const emptyResult = {
          chunks: [],
          query,
          totalResults: 0,
        };
        
        // Cache empty results for shorter time (5 minutes)
        performanceService.set(cacheKey, emptyResult, 300);
        return emptyResult;
      }

      const chunks = await this.prisma.chunk.findMany({
        where: { id: { in: chunkIds } },
        include: {
          document: {
            select: {
              id: true,
              title: true,
              author: true,
              documentType: true,
            },
          },
        },
      });

      // 6. Combine results with similarity scores
      const results = relevantMatches
        .map(match => {
          const chunk = chunks.find(c => c.id === match.id);
          if (!chunk) return null;

          return {
            id: chunk.id,
            text: chunk.chunkText,
            score: match.score,
            metadata: match.metadata || {},
            document: chunk.document,

          };
        })
        .filter((result): result is NonNullable<typeof result> => result !== null)
        .sort((a, b) => b.score - a.score); // Sort by similarity score

      console.log(`✅ Found ${results.length} relevant chunks`);

      const result = {
        chunks: results,
        query,
        totalResults: results.length,
      };

      // Cache successful results for 10 minutes
      performanceService.set(cacheKey, result, 600);

      return result;

    } catch (error) {
      console.error('❌ Failed to retrieve chunks:', error);
      throw new Error(
        `Failed to retrieve chunks: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update a document (re-process and re-embed)
   */
  async updateDocument(documentId: string, input: Partial<DocumentCreateInput>): Promise<DocumentWithChunks> {
    console.log(`🔄 Updating document: ${documentId}`);

    try {
      // Get existing document
      const existingDocument = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: { chunks: true },
      });

      if (!existingDocument) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Delete existing vectors from Pinecone
      if (existingDocument.chunks.length > 0) {
        const chunkIds = existingDocument.chunks.map(c => c.id);
        await this.vectorStore.delete(chunkIds);
      }

      // If content is being updated, recreate the document
      if (input.content) {
        // Delete existing document and chunks
        await this.prisma.document.delete({ where: { id: documentId } });

        // Create new document with updated content
        return await this.addDocument({
          title: input.title || existingDocument.title,
          content: input.content,
          sourceUrl: input.sourceUrl || existingDocument.sourceUrl || undefined,
          filePath: input.filePath || existingDocument.filePath || undefined,
          author: input.author || existingDocument.author || undefined,
          publicationDate: input.publicationDate || existingDocument.publicationDate || undefined,
          documentType: input.documentType || existingDocument.documentType || undefined,
          tags: input.tags || existingDocument.tags,
          metadata: input.metadata || (existingDocument.metadata as Record<string, unknown>) || undefined,
        });
      } else {
        // Update only metadata
        const updatedDocument = await this.prisma.document.update({
          where: { id: documentId },
          data: {
            title: input.title,
            sourceUrl: input.sourceUrl,
            filePath: input.filePath,
            author: input.author,
            publicationDate: input.publicationDate,
            documentType: input.documentType,
            tags: input.tags,
            metadata: input.metadata as Prisma.InputJsonValue,
          },
        });

        // Get chunks separately since we don't need to update them
        const chunks = await this.prisma.chunk.findMany({
          where: { documentId },
        });

        return {
          id: updatedDocument.id,
          title: updatedDocument.title,
          author: updatedDocument.author,
          documentType: updatedDocument.documentType,
          tags: updatedDocument.tags,
          metadata: updatedDocument.metadata as Record<string, unknown>,
          createdAt: updatedDocument.createdAt,
          updatedAt: updatedDocument.updatedAt,
          chunks: chunks.map(chunk => ({
            id: chunk.id,
            chunkText: chunk.chunkText,
            chunkNumber: chunk.chunkNumber,
            startOffset: chunk.startOffset,
            endOffset: chunk.endOffset,
            embeddingModelName: chunk.embeddingModelName,
          })),
        };
      }

    } catch (error) {
      console.error('❌ Failed to update document:', error);
      throw new Error(
        `Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a document and its chunks
   */
  async deleteDocument(documentId: string): Promise<void> {
    console.log(`🗑️ Deleting document: ${documentId}`);

    try {
      // Get document with chunks
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: { chunks: true },
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Delete vectors from Pinecone
      if (document.chunks.length > 0) {
        const chunkIds = document.chunks.map(c => c.id);
        await this.vectorStore.delete(chunkIds);
      }

      // Delete document from PostgreSQL (chunks will be deleted by cascade)
      await this.prisma.document.delete({ where: { id: documentId } });

      // Clear relevant caches after document deletion
      performanceService.clearByPattern('query');
      performanceService.clearByPattern('documents');

      console.log(`✅ Document deleted: ${documentId}`);

    } catch (error) {
      console.error('❌ Failed to delete document:', error);
      throw new Error(
        `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete all documents and their chunks
   */
  async deleteAllDocuments(): Promise<{ deletedCount: number }> {
    console.log('🗑️ Deleting ALL documents from knowledge base...');

    try {
      // Get all documents with chunks
      const documents = await this.prisma.document.findMany({
        include: { chunks: true },
      });

      if (documents.length === 0) {
        console.log('📄 No documents found to delete');
        return { deletedCount: 0 };
      }

      console.log(`📄 Found ${documents.length} documents to delete`);

      // Collect all chunk IDs for vector store deletion
      const allChunkIds = documents.flatMap(doc => doc.chunks.map(chunk => chunk.id));
      
      if (allChunkIds.length > 0) {
        console.log(`🔍 Deleting ${allChunkIds.length} vectors from Pinecone...`);
        await this.vectorStore.delete(allChunkIds);
      }

      // Delete all documents from PostgreSQL (chunks will be deleted by cascade)
      const deleteResult = await this.prisma.document.deleteMany({});
      
      console.log(`✅ Deleted ${deleteResult.count} documents and ${allChunkIds.length} chunks`);
      
      return { deletedCount: deleteResult.count };

    } catch (error) {
      console.error('❌ Failed to delete all documents:', error);
      throw new Error(
        `Failed to delete all documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all documents with pagination
   */
  async getDocuments(
    options: {
      skip?: number;
      take?: number;
      includeChunks?: boolean;
    } = {}
  ): Promise<{ documents: DocumentWithChunks[]; total: number }> {
    const { skip = 0, take = 20, includeChunks = false } = options;

    try {
      const [documents, total] = await Promise.all([
        this.prisma.document.findMany({
          skip,
          take,
          include: includeChunks ? { chunks: true } : { chunks: false },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.document.count(),
      ]);

      return {
        documents: documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          author: doc.author,
          documentType: doc.documentType,
          tags: doc.tags,
          metadata: doc.metadata as Record<string, unknown>,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          sourceUrl: doc.sourceUrl,
          chunks: includeChunks ? doc.chunks.map(chunk => ({
            id: chunk.id,
            chunkText: chunk.chunkText,
            chunkNumber: chunk.chunkNumber,
            startOffset: chunk.startOffset,
            endOffset: chunk.endOffset,
            embeddingModelName: chunk.embeddingModelName,
          })) : [],
        })),
        total,
      };

    } catch (error) {
      throw new Error(
        `Failed to get documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a single document by ID
   */
  async getDocumentById(
    documentId: string,
    includeChunks: boolean = false
  ): Promise<DocumentWithChunks | null> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: { chunks: includeChunks },
      });

      if (!document) {
        return null;
      }

      return {
        id: document.id,
        title: document.title,
        author: document.author,
        documentType: document.documentType,
        tags: document.tags,
        metadata: document.metadata as Record<string, unknown>,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        sourceUrl: document.sourceUrl,
        chunks: includeChunks ? document.chunks.map(chunk => ({
          id: chunk.id,
          chunkText: chunk.chunkText,
          chunkNumber: chunk.chunkNumber,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
          embeddingModelName: chunk.embeddingModelName,
        })) : [],
      };

    } catch (error) {
      throw new Error(
        `Failed to get document by ID: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get chunks for a specific document
   */
  async getDocumentChunks(documentId: string): Promise<{
    id: string;
    chunkText: string;
    chunkNumber?: number | null;
    startOffset?: number | null;
    endOffset?: number | null;
  }[]> {
    try {
      const chunks = await this.prisma.chunk.findMany({
        where: { documentId },
        orderBy: { chunkNumber: 'asc' },
      });

      return chunks.map(chunk => ({
        id: chunk.id,
        chunkText: chunk.chunkText,
        chunkNumber: chunk.chunkNumber,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
      }));

    } catch (error) {
      throw new Error(
        `Failed to get document chunks: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get knowledge base statistics
   */
  async getStats(): Promise<{
    totalDocuments: number;
    totalChunks: number;
    vectorStoreStats: Record<string, unknown>;
  }> {
    try {
      const [totalDocuments, totalChunks, vectorStoreStats] = await Promise.all([
        this.prisma.document.count(),
        this.prisma.chunk.count(),
        this.vectorStore.getStats(),
      ]);

      return {
        totalDocuments,
        totalChunks,
        vectorStoreStats,
      };

    } catch (error) {
      throw new Error(
        `Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Cleanup resources
   */
  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }

  /**
   * Re-upload a document by re-processing its content
   * Used for updating documents with new content or different processing options
   */
  async reuploadDocument(
    documentId: string,
    options: {
      newUrl?: string;
      selectorsToIgnore?: string[];
    } = {}
  ): Promise<DocumentWithChunks> {
    console.log(`🔄 Re-uploading document: ${documentId}`);

    try {
      // 1. Fetch the existing document (outside transaction)
      const existingDocument = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: { chunks: true },
      });

      if (!existingDocument) {
        throw new Error(`Document with ID ${documentId} not found`);
      }

      // 2. Determine the URL to use for re-upload
      const urlToUse = options.newUrl || existingDocument.sourceUrl;
      
      if (!urlToUse) {
        throw new Error('No URL available for re-upload. Document must have a sourceUrl or provide newUrl.');
      }

      // 3. Load fresh content from the URL (outside transaction)
      console.log(`🌐 Loading fresh content from: ${urlToUse}`);
      const webResult = await this.webContentService.loadWebContent(
        urlToUse,
        { selectorsToIgnore: options.selectorsToIgnore }
      );

      // 4. Chunk the new content (outside transaction)
      const chunks = await chunkText(webResult.content);
      console.log(`� Re-processed document into ${chunks.length} chunks`);

      // 5. Generate embeddings for new chunks (outside transaction)
      const chunkTexts = chunks.map((chunk: TextChunk) => chunk.text);
      const embeddings = await this.embeddingService.embedTexts(chunkTexts);
      console.log(`🧮 Generated embeddings for ${embeddings.length} new chunks`);

      // 6. Start transaction for database operations only
      const result = await this.prisma.$transaction(async (tx) => {
        // Delete existing chunks from PostgreSQL
        const chunkIds = existingDocument.chunks.map(chunk => chunk.id);
        
        if (chunkIds.length > 0) {
          await tx.chunk.deleteMany({
            where: { documentId },
          });
          console.log(`🗑️ Deleted ${chunkIds.length} existing chunks from PostgreSQL`);
        }

        // Update the document metadata
        const updatedDocument = await tx.document.update({
          where: { id: documentId },
          data: {
            sourceUrl: urlToUse,
            updatedAt: new Date(),
            metadata: {
              ...((existingDocument.metadata as Record<string, unknown>) || {}),
              webMetadata: webResult.metadata,
              reuploadedAt: new Date().toISOString(),
              selectorsIgnored: options.selectorsToIgnore,
            } as Prisma.InputJsonValue,
          },
        });

        // Save new chunks and prepare vectors
        const vectors: Vector[] = [];
        const chunkRecords = [];

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const embedding = embeddings[i];

          // Save chunk to PostgreSQL
          const chunkRecord = await tx.chunk.create({
            data: {
              documentId: existingDocument.id,
              chunkText: chunk.text,
              chunkNumber: chunk.metadata.chunkIndex,
              startOffset: chunk.metadata.startChar,
              endOffset: chunk.metadata.endChar,
              embeddingModelName: this.embeddingService.getModelName(),
            },
          });

          chunkRecords.push(chunkRecord);

          // Prepare vector for Pinecone
          vectors.push({
            id: chunkRecord.id,
            values: embedding,
            metadata: {
              documentId: existingDocument.id,
              chunkId: chunkRecord.id,
              chunkIndex: chunk.metadata.chunkIndex,
              title: existingDocument.title,
              author: existingDocument.author || undefined,
              documentType: existingDocument.documentType || undefined,
              tags: existingDocument.tags.join(','),
              text: chunk.text.substring(0, 1000),
            },
          });
        }

        return { updatedDocument, chunkRecords, vectors, chunkIds };
      }, {
        timeout: 30000, // 30 seconds timeout for database operations
      });

      // 7. Update vector store (outside transaction)
      if (result.chunkIds.length > 0) {
        await this.vectorStore.delete(result.chunkIds);
        console.log(`🗑️ Deleted ${result.chunkIds.length} existing vectors from Pinecone`);
      }

      await this.vectorStore.upsert(result.vectors);
      console.log(`🔍 Stored ${result.vectors.length} new vectors in Pinecone`);

      // 8. Return updated document with new chunks
      return {
        id: result.updatedDocument.id,
        title: result.updatedDocument.title,
        author: result.updatedDocument.author,
        documentType: result.updatedDocument.documentType,
        tags: result.updatedDocument.tags,
        metadata: result.updatedDocument.metadata as Record<string, unknown>,
        createdAt: result.updatedDocument.createdAt,
        updatedAt: result.updatedDocument.updatedAt,
        chunks: result.chunkRecords.map(chunk => ({
          id: chunk.id,
          chunkText: chunk.chunkText,
          chunkNumber: chunk.chunkNumber,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
          embeddingModelName: chunk.embeddingModelName,
        })),
      };

    } catch (error) {
      console.error('❌ Failed to re-upload document:', error);
      throw new Error(
        `Failed to re-upload document: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Add multiple documents from URLs concurrently
   */
  async addDocumentsFromUrls(
    urls: string[],
    options: {
      selectorsToIgnore?: string[];
      commonMetadata?: Partial<DocumentCreateInput>;
      batchSize?: number;
    } = {}
  ): Promise<DocumentWithChunks[]> {
    const { selectorsToIgnore, commonMetadata = {}, batchSize = 3 } = options;
    
    console.log(`📚 Adding ${urls.length} documents from URLs`);
    
    // Load content from all URLs first
    const webResults = await this.webContentService.loadMultipleWebContent(
      urls,
      { selectorsToIgnore }
    );

    // Process documents in batches to avoid overwhelming the system
    const results: DocumentWithChunks[] = [];
    
    for (let i = 0; i < webResults.length; i += batchSize) {
      const batch = webResults.slice(i, i + batchSize);
      
      const batchPromises = batch.map(webResult => {
        const documentInput: DocumentCreateInput = {
          title: webResult.metadata.title || `Document from ${webResult.metadata.url}`,
          content: webResult.content,
          url: webResult.metadata.url,
          sourceUrl: webResult.metadata.url,
          documentType: 'web_content',
          metadata: {
            ...commonMetadata.metadata,
            webMetadata: webResult.metadata,
            loadedFromUrl: true,
          },
          selectorsToIgnore,
          ...commonMetadata,
        };

        return this.addDocument(documentInput);
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(webResults.length / batchSize)}`);
    }

    console.log(`✅ Successfully added ${results.length} documents from URLs`);
    return results;
  }
}

/**
 * Factory function to create a knowledge base service
 */
export function createKnowledgeBaseService(): KnowledgeBaseService {
  return new KnowledgeBaseService();
}
