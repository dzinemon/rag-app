/**
 * Performance Monitoring API
 * GET /api/admin/performance - Get cache and performance statistics (Admin-only)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { performanceService } from '@/services/performanceService';

export async function GET() {
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

    // 2. Get performance statistics
    const cacheStats = performanceService.getStats();

    // 3. Get system information
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };

    // 4. Return performance data
    return NextResponse.json({
      success: true,
      performance: {
        cache: {
          ...cacheStats,
          hitRatePercent: Math.round(cacheStats.hitRate * 100),
        },
        system: systemInfo,
        recommendations: generateRecommendations(cacheStats),
      },
    });

  } catch (error) {
    console.error('❌ Failed to get performance stats:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to get performance statistics',
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
        { error: 'Forbidden', message: 'Admin role required' },
        { status: 403 }
      );
    }

    // 2. Clear all caches
    performanceService.clear();
    
    console.log(`🧹 Admin ${session.user.email} cleared all caches`);

    // 3. Return success
    return NextResponse.json({
      success: true,
      message: 'All caches cleared successfully',
    });

  } catch (error) {
    console.error('❌ Failed to clear caches:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to clear caches',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(cacheStats: { hitRate: number; size: number; misses: number }): string[] {
  const recommendations: string[] = [];

  if (cacheStats.hitRate < 0.5) {
    recommendations.push('Cache hit rate is low. Consider increasing cache TTL for frequently accessed data.');
  }

  if (cacheStats.size > 800) {
    recommendations.push('Cache size is getting large. Monitor memory usage and consider cache size limits.');
  }

  if (cacheStats.hitRate === 0 && cacheStats.misses > 0) {
    recommendations.push('No cache hits detected. Verify caching is working correctly.');
  }

  if (cacheStats.hitRate > 0.8) {
    recommendations.push('Excellent cache performance! Consider expanding caching to other endpoints.');
  }

  return recommendations;
}
