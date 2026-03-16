/**
 * Caching Service - Database-backed with optional Redis fallback
 * 
 * Features:
 * - TTL-based expiration
 * - Automatic cleanup of expired entries
 * - Optional Redis for hot data (faster lookups)
 * - Fallback to DB cache if Redis unavailable
 * 
 * Environment Variables:
 * - REDIS_URL: Optional Redis connection string (e.g., redis://localhost:6379)
 * - CACHE_TTL_GEOCODING: TTL for geocoding results (default: 86400 = 24h)
 * - CACHE_TTL_WEATHER: TTL for weather data (default: 3600 = 1h)
 * - CACHE_TTL_POI: TTL for POI data (default: 604800 = 7d)
 */

import { cacheModel } from '../config/dataStore';
import { v4 as uuidv4 } from 'uuid';

// Redis client (optional)
let redisClient: any = null;
let useRedis = false;

// Initialize Redis if configured
export const initRedis = async () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log('ℹ️  Redis not configured. Using database-backed cache.');
    return;
  }

  try {
    // Uncomment when redis is installed: npm install redis
    // const redis = require('redis');
    // redisClient = redis.createClient({ url: redisUrl });
    // await redisClient.connect();
    // useRedis = true;
    // console.log('✅ Redis connected for caching');
    console.log('⚠️  Redis client not installed. To enable, run: npm install redis');
  } catch (error) {
    console.error('⚠️  Redis connection failed, falling back to database cache:', error);
  }
};

// Cache key generator
const generateCacheKey = (provider: string, params: Record<string, any>): string => {
  const paramStr = JSON.stringify(params);
  return `${provider}:${Buffer.from(paramStr).toString('base64')}`;
};

// Get cache entry
export const getCache = async (
  key: string,
  provider: string = 'general'
): Promise<any | null> => {
  try {
    // Try Redis first
    if (useRedis && redisClient) {
      const cached = await redisClient.get(key);
      if (cached) {
        console.log(`💾 Cache hit (Redis): ${key}`);
        return JSON.parse(cached);
      }
    }

    // Fall back to database
    const entry = await cacheModel.getValidByKey(key);

    if (entry) {
      console.log(`💾 Cache hit (DB): ${key}`);
      // Update hit count and last accessed
      await cacheModel.touch(key);
      return JSON.parse(entry.value);
    }

    return null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

// Set cache entry
export const setCache = async (
  key: string,
  value: any,
  ttlSeconds: number = 3600,
  provider: string = 'general'
): Promise<void> => {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const valueStr = JSON.stringify(value);

    // Set in Redis
    if (useRedis && redisClient) {
      await redisClient.setEx(key, ttlSeconds, valueStr);
    }

    // Always set in database (for persistence)
    await cacheModel.upsert({
      id: uuidv4(),
      key,
      value: valueStr,
      provider,
      ttlSeconds,
      expiresAt,
    });

    console.log(`💾 Cache set: ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.error('Cache set error:', error);
  }
};

// Invalidate cache entry
export const invalidateCache = async (key: string): Promise<void> => {
  try {
    if (useRedis && redisClient) {
      await redisClient.del(key);
    }
    await cacheModel.deleteByKey(key);
    console.log(`🗑️  Cache invalidated: ${key}`);
  } catch (error) {
    console.error('Cache invalidate error:', error);
  }
};

// Invalidate by pattern (e.g., geocoding:*)
export const invalidateCachePattern = async (pattern: string): Promise<void> => {
  try {
    // Database pattern matching
    await cacheModel.deleteByPattern(pattern.replace('*', '%'));
    
    // Redis pattern matching (if available)
    if (useRedis && redisClient) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    }
    
    console.log(`🗑️  Cache pattern invalidated: ${pattern}`);
  } catch (error) {
    console.error('Cache pattern invalidate error:', error);
  }
};

// Clear expired cache entries
export const clearExpiredCache = async (): Promise<number> => {
  try {
    const deleted = await cacheModel.clearExpired();
    console.log(`🧹 Cleaned up ${deleted} expired cache entries`);
    return deleted;
  } catch (error) {
    console.error('Cache cleanup error:', error);
    return 0;
  }
};

// Get cache statistics
export const getCacheStats = async (): Promise<any> => {
  try {
    const stats = await cacheModel.getStats();
    return stats;
  } catch (error) {
    console.error('Cache stats error:', error);
    return null;
  }
};

// Convenience function: get or fetch
export const cacheOrFetch = async (
  key: string,
  fetchFn: () => Promise<any>,
  ttlSeconds: number = 3600,
  provider: string = 'general'
): Promise<any> => {
  // Try cache first
  const cached = await getCache(key, provider);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache
  try {
    const data = await fetchFn();
    await setCache(key, data, ttlSeconds, provider);
    return data;
  } catch (error) {
    console.error(`Cache fetch error for ${key}:`, error);
    throw error;
  }
};

export default {
  initRedis,
  getCache,
  setCache,
  invalidateCache,
  invalidateCachePattern,
  clearExpiredCache,
  getCacheStats,
  cacheOrFetch,
};
