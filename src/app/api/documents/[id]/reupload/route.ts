/**
 * Document Re-upload API Endpoint (Admin-Only)
 * PUT /api/documents/[id]/reupload - Re-upload a document from URL with new options
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { KnowledgeBaseService } from '@/services/knowledgeBaseService';
import { z } from 'zod';

// Request validation schema
const ReuploadRequestSchema = z.object({
  newUrl: z.string().url('Invalid URL format').optional(),
  selectorsToIgnore: z.array(z.string()).optional(),
});

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  
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
        { error: 'Forbidden', message: 'Admin role required for document re-upload' },
        { status: 403 }
      );
    }

    // 2. Validate document ID
    const documentId = params.id;
    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Valid document ID is required' },
        { status: 400 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const parseResult = ReuploadRequestSchema.safeParse(body);

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

    // 4. Initialize knowledge base service
    const knowledgeBase = new KnowledgeBaseService();
    await knowledgeBase.init();

    // 5. Re-upload the document
    console.log(`🔄 Admin ${session.user.email} is re-uploading document: ${documentId}`);

    const document = await knowledgeBase.reuploadDocument(documentId, {
      newUrl: data.newUrl,
      selectorsToIgnore: data.selectorsToIgnore,
    });

    // 6. Clean up
    await knowledgeBase.close();

    // 7. Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Document re-uploaded successfully',
        document: {
          id: document.id,
          title: document.title,
          author: document.author,
          documentType: document.documentType,
          tags: document.tags,
          chunksCount: document.chunks.length,
          updatedAt: document.updatedAt,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Document re-upload failed:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Document not found' },
          { status: 404 }
        );
      }

      if (error.message.includes('No URL available')) {
        return NextResponse.json(
          { error: 'Validation Error', message: 'Document must have a sourceUrl or provide newUrl for re-upload' },
          { status: 400 }
        );
      }

      if (error.message.includes('Failed to connect') || error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'External Service Error', message: 'Failed to load content from URL' },
          { status: 502 }
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
          { error: 'Database Error', message: 'Failed to update document data' },
          { status: 500 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to re-upload document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
