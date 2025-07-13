/**
 * Document Ingestion API Endpoint (Admin-Only)
 * POST /api/ingest - Add documents to the knowledge base
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { KnowledgeBaseService } from '@/services/knowledgeBaseService';
import { z } from 'zod';

// Request validation schema - supports both content and URL inputs
const IngestRequestSchema = z.object({
  // Basic document info
  title: z.string().min(1, 'Title is required'),
  
  // Content sources (at least one required)
  content: z.string().min(10, 'Content must be at least 10 characters').optional(),
  url: z.string().url('Invalid URL format').optional(),
  urls: z.array(z.string().url()).optional(), // For bulk URL ingestion
  
  // Optional metadata
  sourceUrl: z.string().url().optional(),
  filePath: z.string().optional(),
  author: z.string().optional(),
  publicationDate: z.string().datetime().optional(),
  documentType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  
  // Web scraping options
  selectorsToIgnore: z.array(z.string()).optional(),
}).refine(
  (data) => data.content || data.url || (data.urls && data.urls.length > 0),
  {
    message: "Must provide either 'content', 'url', or 'urls'",
    path: ["content"],
  }
);

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication and authorization
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin role required for document ingestion' },
        { status: 403 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const parseResult = IngestRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Invalid request data',
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // 3. Initialize knowledge base service
    const knowledgeBase = new KnowledgeBaseService();
    await knowledgeBase.init();

    // 4. Process the document(s) based on input type
    console.log(`📄 Admin ${session.user.email} is ingesting: ${data.title}`);

    if (data.urls && data.urls.length > 0) {
      // Bulk URL ingestion - process each URL individually with error handling
      console.log(`📚 Processing ${data.urls.length} URLs individually`);
      
      const results: Array<{
        id: string;
        title: string;
        author?: string | null;
        documentType?: string | null;
        tags: string[];
        chunksCount: number;
        createdAt: Date;
        sourceUrl: string;
        status: 'success';
      }> = [];
      
      const errors: Array<{
        url: string;
        error: string;
        status: 'failed';
      }> = [];
      
      // Process URLs one by one for better error handling
      for (let i = 0; i < data.urls.length; i++) {
        const url = data.urls[i];
        console.log(`📄 Processing URL ${i + 1}/${data.urls.length}: ${url}`);
        
        try {
          // Validate URL format
          new URL(url); // This will throw if URL is invalid
          
          const document = await knowledgeBase.addDocument({
            title: '', // Let the knowledge base service extract the actual web page title
            url: url,
            sourceUrl: url,
            author: data.author,
            documentType: data.documentType || 'web_content',
            tags: data.tags,
            metadata: data.metadata,
            selectorsToIgnore: data.selectorsToIgnore,
          });

          results.push({
            id: document.id,
            title: document.title,
            author: document.author,
            documentType: document.documentType,
            tags: document.tags,
            chunksCount: document.chunks.length,
            createdAt: document.createdAt,
            sourceUrl: url,
            status: 'success'
          });
          
          console.log(`✅ Successfully processed: ${url}`);
          
        } catch (error) {
          console.error(`❌ Failed to process URL: ${url}`, error);
          
          errors.push({
            url: url,
            error: error instanceof Error ? error.message : 'Unknown error',
            status: 'failed'
          });
        }
      }

      // Return results with success/error breakdown
      const successCount = results.length;
      const errorCount = errors.length;
      
      if (successCount > 0 && errorCount === 0) {
        // All succeeded
        return NextResponse.json(
          {
            success: true,
            message: `Successfully ingested all ${successCount} documents from URLs`,
            documents: results,
            totalDocuments: successCount,
            errors: []
          },
          { status: 201 }
        );
      } else if (successCount > 0 && errorCount > 0) {
        // Partial success
        return NextResponse.json(
          {
            success: true,
            message: `Partially successful: ${successCount} documents ingested, ${errorCount} failed`,
            documents: results,
            totalDocuments: successCount,
            errors: errors
          },
          { status: 207 } // Multi-status
        );
      } else {
        // All failed
        return NextResponse.json(
          {
            success: false,
            message: `Failed to ingest any documents. All ${errorCount} URLs failed.`,
            documents: [],
            totalDocuments: 0,
            errors: errors
          },
          { status: 400 }
        );
      }

    } else {
      // Single document ingestion (content or single URL)
      const document = await knowledgeBase.addDocument({
        title: data.title,
        content: data.content,
        url: data.url,
        sourceUrl: data.sourceUrl,
        filePath: data.filePath,
        author: data.author,
        publicationDate: data.publicationDate ? new Date(data.publicationDate) : undefined,
        documentType: data.documentType,
        tags: data.tags,
        metadata: data.metadata,
        selectorsToIgnore: data.selectorsToIgnore,
      });

      // Return single document result
      return NextResponse.json(
        {
          success: true,
          message: 'Document ingested successfully',
          document: {
            id: document.id,
            title: document.title,
            author: document.author,
            documentType: document.documentType,
            tags: document.tags,
            chunksCount: document.chunks.length,
            createdAt: document.createdAt,
          },
        },
        { status: 201 }
      );
    }

    // Clean up resources
    await knowledgeBase.close();

  } catch (error) {
    console.error('❌ Document ingestion failed:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Failed to initialize')) {
        return NextResponse.json(
          { error: 'Service Error', message: 'Knowledge base initialization failed' },
          { status: 503 }
        );
      }

      if (error.message.includes('embedding') || error.message.includes('vector')) {
        return NextResponse.json(
          { error: 'AI Service Error', message: 'Failed to process document embeddings' },
          { status: 502 }
        );
      }

      if (error.message.includes('database') || error.message.includes('Prisma')) {
        return NextResponse.json(
          { error: 'Database Error', message: 'Failed to store document data' },
          { status: 500 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to ingest document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check service status (Admin-only)
export async function GET() {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin role required' },
        { status: 403 }
      );
    }

    // Get knowledge base statistics
    const knowledgeBase = new KnowledgeBaseService();
    const stats = await knowledgeBase.getStats();
    await knowledgeBase.close();

    return NextResponse.json({
      status: 'operational',
      stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Failed to get ingestion service status:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to get service status',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
