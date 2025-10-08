/**
 * Multi-Level Caching Strategy
 * Implements CDN, Redis, and in-memory caching
 * Requirements: 7.5, 9.2
 */

import { getCachedResult, cacheResult, generateCacheKey } from './cache';

// In-memory cache for frequently accessed data
const memoryCache = new Map<string, { data: any; expiry: number }>();

export enum CacheLevel {
  MEMORY = 'memory',
  REDIS = 'redis',
  CDN = 'cdn',
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  levels?: CacheLevel[]; // Which cache levels to use
}

/**
 * Get data from multi-level cache
 */
export async function getFromCache<T>(
  key: string,
  options: CacheOptions = {}
): Promise<T | null> {
  const levels = options.levels || [CacheLevel.MEMORY, CacheLevel.REDIS];

  // Try memory cache first
  if (levels.includes(CacheLevel.MEMORY)) {
    const memoryResult = getFromMemoryCache<T>(key);
    if (memoryResult !== null) {
      return memoryResult;
    }
  }

  // Try Redis cache
  if (levels.includes(CacheLevel.REDIS)) {
    const redisResult = await getCachedResult(key);
    if (redisResult !== null) {
      // Populate memory cache for faster subsequent access
      if (levels.includes(CacheLevel.MEMORY)) {
        setInMemoryCache(key, redisResult, options.ttl || 300);
      }
      return redisResult as T;
    }
  }

  return null;
}

/**
 * Set data in multi-level cache
 */
export async function setInCache<T>(
  key: string,
  data: T,
  options: CacheOptions = {}
): Promise<void> {
  const levels = options.levels || [CacheLevel.MEMORY, CacheLevel.REDIS];
  const ttl = options.ttl || 300;

  // Set in memory cache
  if (levels.includes(CacheLevel.MEMORY)) {
    setInMemoryCache(key, data, ttl);
  }

  // Set in Redis cache
  if (levels.includes(CacheLevel.REDIS)) {
    await cacheResult(key, data as any, ttl);
  }
}

/**
 * Get from in-memory cache
 */
function getFromMemoryCache<T>(key: string): T | null {
  const cached = memoryCache.get(key);

  if (!cached) {
    return null;
  }

  // Check if expired
  if (Date.now() > cached.expiry) {
    memoryCache.delete(key);
    return null;
  }

  return cached.data as T;
}

/**
 * Set in in-memory cache
 */
function setInMemoryCache<T>(key: string, data: T, ttlSeconds: number): void {
  const expiry = Date.now() + ttlSeconds * 1000;
  memoryCache.set(key, { data, expiry });

  // Limit memory cache size
  if (memoryCache.size > 1000) {
    const firstKey = memoryCache.keys().next().value;
    memoryCache.delete(firstKey);
  }
}

/**
 * Clear expired entries from memory cache
 */
export function clearExpiredMemoryCache(): void {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (now > value.expiry) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Get cache statistics
 */
export function getMemoryCacheStats(): {
  size: number;
  keys: string[];
} {
  return {
    size: memoryCache.size,
    keys: Array.from(memoryCache.keys()),
  };
}

// Clean up expired entries every 5 minutes
setInterval(clearExpiredMemoryCache, 5 * 60 * 1000);
