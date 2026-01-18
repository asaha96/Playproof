/**
 * Level Cache Service
 * In-memory LRU cache for generated levels
 */

import type { PcgLevelResponse } from '@playproof/shared';

interface CacheEntry {
  response: PcgLevelResponse;
  createdAt: number;
  accessedAt: number;
}

const MAX_CACHE_SIZE = 100;
const MAX_AGE_MS = 1000 * 60 * 60; // 1 hour

const cache = new Map<string, CacheEntry>();

/**
 * Generate cache key from request parameters
 */
export function getCacheKey(
  gameId: string,
  difficulty: string,
  seed?: string | number
): string {
  return `${gameId}:${difficulty}:${seed ?? 'random'}`;
}

/**
 * Get cached level if available and not expired
 */
export function getCached(key: string): PcgLevelResponse | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  
  // Check expiration
  if (Date.now() - entry.createdAt > MAX_AGE_MS) {
    cache.delete(key);
    return null;
  }
  
  // Update access time
  entry.accessedAt = Date.now();
  return entry.response;
}

/**
 * Store level in cache
 */
export function setCache(key: string, response: PcgLevelResponse): void {
  // Evict oldest entries if at capacity
  if (cache.size >= MAX_CACHE_SIZE) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [k, v] of cache.entries()) {
      if (v.accessedAt < oldestTime) {
        oldestTime = v.accessedAt;
        oldestKey = k;
      }
    }
    
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }
  
  cache.set(key, {
    response,
    createdAt: Date.now(),
    accessedAt: Date.now()
  });
}

/**
 * Clear all cached levels
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE
  };
}
