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
      // 3. Get document by ID
      const document = await knowledgeBase.getDocumentById(params.id);

      if (!document) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Document not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(document);
    } finally {
      // 4. Clean up
      await knowledgeBase.close();
    }
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: 'Failed to fetch document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    // 2. Resolve params
    const params = await context.params;

    // 3. Initialize knowledge base service
    const knowledgeBase = new KnowledgeBaseService();

    try {
      // 4. Delete the document
      await knowledgeBase.deleteDocument(params.id);

      console.log(`🗑️ Admin ${session.user.email} deleted document: ${params.id}`);

      return NextResponse.json({
        success: true,
        message: 'Document deleted successfully',
        documentId: params.id,
      });
    } finally {
      // 5. Clean up
      await knowledgeBase.close();
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: 'Failed to delete document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
