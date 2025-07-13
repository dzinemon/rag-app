import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { KnowledgeBaseService } from '@/services/knowledgeBaseService';

export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication (no role restriction for browsing)
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // 3. Initialize knowledge base service
    const knowledgeBase = new KnowledgeBaseService();

    try {
      // 4. Get documents with pagination and chunk counts
      const skip = (page - 1) * limit;
      const result = await knowledgeBase.getDocuments({
        skip,
        take: limit,
        includeChunks: true, // Include chunks to get counts and word counts
      });

      // 5. Transform documents to include computed fields
      const documentsWithCounts = result.documents.map((doc) => {
        const chunkCount = doc.chunks.length;
        const wordCount = doc.chunks.reduce((total, chunk) => {
          return total + chunk.chunkText.split(/\s+/).length;
        }, 0);

        return {
          id: doc.id,
          title: doc.title,
          author: doc.author,
          documentType: doc.documentType,
          tags: doc.tags,
          metadata: doc.metadata,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          sourceUrl: doc.sourceUrl,
          url: doc.sourceUrl, // Alias for frontend compatibility
          description: doc.metadata?.description as string || undefined,
          _count: { chunks: chunkCount },
          wordCount,
        };
      });

      return NextResponse.json(documentsWithCounts);
    } finally {
      // 6. Clean up
      await knowledgeBase.close();
    }
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: 'Failed to fetch documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
