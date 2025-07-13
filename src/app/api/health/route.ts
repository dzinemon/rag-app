import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Health check endpoint for production monitoring
 * GET /api/health
 */
export async function GET() {
  try {
    const startTime = Date.now();
    
    // Check database connection
    await prisma.$queryRaw`SELECT 1 as health`;
    const dbTime = Date.now() - startTime;
    
    // Check environment variables
    const envCheck = {
      database: !!process.env.DATABASE_URL,
      nextauth: !!process.env.NEXTAUTH_SECRET,
      openai: !!process.env.OPENAI_API_KEY,
      pinecone: !!process.env.PINECONE_API_KEY,
    };
    
    // Basic system info
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json({
      status: 'healthy',
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      checks: {
        database: {
          status: 'healthy',
          responseTime: `${dbTime}ms`,
        },
        environment: {
          status: Object.values(envCheck).every(Boolean) ? 'healthy' : 'warning',
          variables: envCheck,
        },
        system: systemInfo,
      },
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
}
