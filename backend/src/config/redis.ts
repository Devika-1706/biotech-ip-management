import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// In-memory fallback cache when Redis server is offline
interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}
const memoryCache = new Map<string, MemoryCacheEntry>();

let redisClient: ReturnType<typeof createClient> | null = null;
let isRedisConnected = false;

export const initRedis = async () => {
  try {
    const client = createClient({
      url: REDIS_URL,
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: (retries) => (retries > 5 ? false : Math.min(retries * 100, 1000)),
      },
    });

    client.on('connect', () => {
      isRedisConnected = true;
      console.log('[Redis] Client connected successfully');
    });

    client.on('ready', () => {
      isRedisConnected = true;
      console.log('[Redis] Client ready for commands');
    });

    client.on('error', (err) => {
      if (isRedisConnected) {
        console.warn('[Redis] Connection lost, switching to memory fallback cache:', err.message);
      }
      isRedisConnected = false;
    });

    // Timeout connecting after 1 second
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis connection timed out')), 1000)
    );

    await Promise.race([connectPromise, timeoutPromise])
      .then(() => {
        redisClient = client;
        isRedisConnected = true;
      })
      .catch((err: any) => {
        console.warn(`[Redis] Server unavailable (${err.message}). Active fallback to in-memory TTL caching.`);
        isRedisConnected = false;
        try {
          client.disconnect().catch(() => {});
        } catch {}
      });
  } catch (err: any) {
    console.warn(`[Redis] Initialization notice: ${err.message}. Using resilient memory fallback cache.`);
    isRedisConnected = false;
  }
};

/**
 * Cache GET
 */
export const cacheGet = async <T = any>(key: string): Promise<T | null> => {
  try {
    if (isRedisConnected && redisClient) {
      const data = await redisClient.get(key);
      if (data) {
        return JSON.parse(data) as T;
      }
      return null;
    }
  } catch (err) {
    // fall through to memory cache
  }

  // Memory fallback
  const entry = memoryCache.get(key);
  if (entry) {
    if (entry.expiresAt > Date.now()) {
      try {
        return JSON.parse(entry.value) as T;
      } catch {
        return null;
      }
    } else {
      memoryCache.delete(key);
    }
  }
  return null;
};

/**
 * Cache SET with TTL in seconds
 */
export const cacheSet = async (key: string, value: any, ttlSeconds: number = 300): Promise<void> => {
  const serialized = JSON.stringify(value);
  try {
    if (isRedisConnected && redisClient) {
      await redisClient.setEx(key, ttlSeconds, serialized);
      return;
    }
  } catch (err) {
    // fall through to memory cache
  }

  // Memory fallback
  memoryCache.set(key, {
    value: serialized,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

/**
 * Cache DELETE single key
 */
export const cacheDel = async (key: string): Promise<void> => {
  try {
    if (isRedisConnected && redisClient) {
      await redisClient.del(key);
    }
  } catch (err) {
    // ignore
  }
  memoryCache.delete(key);
};

/**
 * Invalidate cache keys matching prefix or pattern
 */
export const cacheInvalidatePrefix = async (prefix: string): Promise<void> => {
  try {
    if (isRedisConnected && redisClient) {
      const keys = await redisClient.keys(`${prefix}*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    }
  } catch (err) {
    // ignore
  }

  // Memory cache purge
  for (const k of memoryCache.keys()) {
    if (k.startsWith(prefix)) {
      memoryCache.delete(k);
    }
  }
};

/**
 * Helper to invalidate common dashboard/report caches
 */
export const invalidateAllDashboardCaches = async (): Promise<void> => {
  await Promise.all([
    cacheInvalidatePrefix('stats:'),
    cacheInvalidatePrefix('dashboard:'),
    cacheInvalidatePrefix('reports:'),
    cacheInvalidatePrefix('deadlines:'),
  ]);
};

export const getRedisStatus = () => {
  return {
    connected: isRedisConnected,
    mode: isRedisConnected ? 'Redis Server' : 'In-Memory Resilient Cache',
    url: REDIS_URL,
    memoryCacheEntries: memoryCache.size,
  };
};
