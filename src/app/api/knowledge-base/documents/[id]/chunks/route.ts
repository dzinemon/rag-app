import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { KnowledgeBaseService } from '@/services/knowledgeBaseService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Resolve params
    const params = await context.params;

    // 3. Initialize knowledge base service
    const knowledgeBase = new KnowledgeBaseService();

    try {
      // 3. Get chunks for the document
      const chunks = await knowledgeBase.getDocumentChunks(params.id);

      return NextResponse.json(chunks);
    } finally {
      // 4. Clean up
      await knowledgeBase.close();
    }
  } catch (error) {
    console.error('Error fetching document chunks:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: 'Failed to fetch document chunks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
