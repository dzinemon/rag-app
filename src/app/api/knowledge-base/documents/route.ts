/**
 * Knowledge Base Documents API
 * GET /api/knowledge-base/documents - List documents (Admin-only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { KnowledgeBaseService } from '@/services/knowledgeBaseService';
import { performanceService, createCacheKey } from '@/services/performanceService';

export async function GET(request: NextRequest) {
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
        { error: 'Forbidden', message: 'Admin role required' },
        { status: 403 }
      );
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // 3. Check cache first
    const cacheKey = createCacheKey('api:documents', page, limit);
    const cached = performanceService.get(cacheKey);
    if (cached) {
      console.log(`📄 Serving documents from cache (page ${page})`);
      return NextResponse.json(cached);
    }

    // 4. Initialize knowledge base service
    const knowledgeBase = new KnowledgeBaseService();

    // 5. Get documents with pagination (optimized query)
    const skip = (page - 1) * limit;
    // 5. Get documents with pagination (optimized query with chunk counts)
    const [documents, total] = await Promise.all([
      // Get documents with chunk counts in a single query
      knowledgeBase['prisma'].document.findMany({
        skip,
        take: limit,
        include: {
          _count: {
            select: { chunks: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      }),
      knowledgeBase['prisma'].document.count(),
    ]);

    // 6. Clean up
    await knowledgeBase.close();

    // 7. Prepare response
    const response = {
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        author: doc.author,
        documentType: doc.documentType,
        tags: doc.tags,
        chunksCount: doc._count.chunks,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        sourceUrl: doc.sourceUrl,
      })),
      pagination: {
        page,
        limit,
        total: total,
        pages: Math.ceil(total / limit),
      },
    };

    // 8. Cache the response for 1 minute
    performanceService.set(cacheKey, response, 60 * 1000);
    console.log(`💾 Cached documents for page ${page}`);

    // 9. Return documents
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Failed to fetch documents:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch documents',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
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
        { error: 'Forbidden', message: 'Admin role required for document deletion' },
        { status: 403 }
      );
    }

    // 2. Initialize knowledge base service
    const knowledgeBase = new KnowledgeBaseService();

    try {
      // 3. Delete all documents
      const result = await knowledgeBase.deleteAllDocuments();

      // 4. Invalidate all document caches
      performanceService.clear(); // Clear all caches since documents were deleted
      console.log(`🧹 Cache cleared after deleting ${result.deletedCount} documents`);

      console.log(`🗑️ Admin ${session.user.email} deleted ALL documents (${result.deletedCount} documents)`);

      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} documents`,
        deletedCount: result.deletedCount,
      });
    } finally {
      // 5. Clean up
      await knowledgeBase.close();
    }
  } catch (error) {
    console.error('Error deleting all documents:', error);

    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: 'Failed to delete all documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
