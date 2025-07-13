/**
 * Performance Service for caching and query optimization
 * Implements in-memory caching for frequently accessed data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export class PerformanceService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxCacheSize = 1000;
  private stats = { hits: 0, misses: 0 };

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Enforce cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt,
    });
  }

  /**
   * Remove item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Clear cache entries by pattern
   */
  clearByPattern(pattern: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
    
    console.log(`Cleared ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
    };
  }

  /**
   * Cache wrapper for functions
   */
  async cached<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    this.set(key, result, ttl);
    return result;
  }

  /**
   * Evict oldest entries to maintain cache size
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Start automatic cleanup interval
   */
  startCleanupInterval(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => this.cleanup(), intervalMs);
  }
}

// Singleton instance
export const performanceService = new PerformanceService();

// Helper functions for common cache patterns
export function createCacheKey(...parts: (string | number)[]): string {
  return parts.map(p => String(p)).join(':');
}

export function getCachedDocuments() {
  return performanceService.get<{ documents: unknown[]; total: number }>('documents:list');
}

export function setCachedDocuments(data: { documents: unknown[]; total: number }) {
  performanceService.set('documents:list', data, 2 * 60 * 1000); // 2 minutes
}

export function invalidateDocumentCache() {
  performanceService.delete('documents:list');
  // Also clear any document-specific caches
  const stats = performanceService.getStats();
  console.log(`🧹 Cache invalidated. Current cache size: ${stats.size}`);
}
