/**
 * Redis Caching Service
 * Caching layer for AI responses and expensive operations
 */

import { createClient } from "redis";
import type { AIProcessingResult } from "@/types/ai";

// Redis client singleton
let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * Get or create Redis client
 */
async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    await redisClient.connect();
  }

  return redisClient;
}

/**
 * Generate cache key for transcription content
 * Uses content hash to identify similar content
 */
export function generateCacheKey(transcription: string): string {
  // Normalize transcription for better cache hits
  const normalized = transcription
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Create a simple hash
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return `ai:result:${Math.abs(hash).toString(36)}`;
}

/**
 * Get cached AI processing result
 * Requirement 3.3: Cache AI responses for similar content
 */
export async function getCachedResult(
  cacheKey: string
): Promise<AIProcessingResult | null> {
  try {
    const client = await getRedisClient();
    const cached = await client.get(cacheKey);

    if (!cached) {
      return null;
    }

    const result = JSON.parse(cached) as AIProcessingResult;

    // Mark as cached
    result.cached = true;

    console.log(`Cache hit for key: ${cacheKey}`);
    return result;
  } catch (error) {
    console.error("Error getting cached result:", error);
    return null; // Fail gracefully
  }
}

/**
 * Cache AI processing result
 * TTL: 7 days (604800 seconds)
 */
export async function cacheResult(
  cacheKey: string,
  result: AIProcessingResult,
  ttl: number = 604800
): Promise<void> {
  try {
    const client = await getRedisClient();

    // Store result with TTL
    await client.setEx(cacheKey, ttl, JSON.stringify(result));

    console.log(`Cached result for key: ${cacheKey} (TTL: ${ttl}s)`);
  } catch (error) {
    console.error("Error caching result:", error);
    // Don't throw - caching failure shouldn't break the flow
  }
}

/**
 * Invalidate cached result
 */
export async function invalidateCache(cacheKey: string): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.del(cacheKey);
    console.log(`Invalidated cache for key: ${cacheKey}`);
  } catch (error) {
    console.error("Error invalidating cache:", error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  keys: number;
  memory: string;
  hits: number;
  misses: number;
}> {
  try {
    const client = await getRedisClient();

    const info = await client.info("stats");
    const keyspace = await client.info("keyspace");

    // Parse stats from info string
    const hitsMatch = info.match(/keyspace_hits:(\d+)/);
    const missesMatch = info.match(/keyspace_misses:(\d+)/);
    const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
    const keysMatch = keyspace.match(/keys=(\d+)/);

    return {
      keys: keysMatch ? parseInt(keysMatch[1]) : 0,
      memory: memoryMatch ? memoryMatch[1] : "0B",
      hits: hitsMatch ? parseInt(hitsMatch[1]) : 0,
      misses: missesMatch ? parseInt(missesMatch[1]) : 0,
    };
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return { keys: 0, memory: "0B", hits: 0, misses: 0 };
  }
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Check if content is similar enough to use cached result
 * Uses Levenshtein distance for similarity comparison
 */
export function isSimilarContent(
  content1: string,
  content2: string,
  threshold: number = 0.85
): boolean {
  const normalized1 = content1.toLowerCase().replace(/[^\w\s]/g, "");
  const normalized2 = content2.toLowerCase().replace(/[^\w\s]/g, "");

  const similarity = calculateSimilarity(normalized1, normalized2);
  return similarity >= threshold;
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
