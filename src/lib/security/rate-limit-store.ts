/**
 * HOUSEYE.COM — Rate limit store
 * Uses Redis if REDIS_URL set, else in-memory (single instance).
 */

type Entry = { count: number; resetAt: number };

const memory = new Map<string, Entry>();

async function redisIncr(
  key: string,
  windowMs: number
): Promise<{ count: number; resetAt: number } | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    // Minimal Redis via fetch-compatible REST is uncommon; use raw TCP-less
    // ioredis optional dynamic import
    const Redis = (await import('ioredis')).default;
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    await client.connect();
    const rkey = `rl:${key}`;
    const count = await client.incr(rkey);
    if (count === 1) {
      await client.pexpire(rkey, windowMs);
    }
    const ttl = await client.pttl(rkey);
    await client.quit();
    return {
      count,
      resetAt: Date.now() + (ttl > 0 ? ttl : windowMs),
    };
  } catch (err) {
    console.error('[Houseye] Redis rate limit fallback to memory', err);
    return null;
  }
}

export async function rateLimitAsync(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; retryAfterSec: number }> {
  const fromRedis = await redisIncr(key, windowMs);
  if (fromRedis) {
    return {
      allowed: fromRedis.count <= limit,
      remaining: Math.max(0, limit - fromRedis.count),
      retryAfterSec: Math.ceil((fromRedis.resetAt - Date.now()) / 1000),
    };
  }

  // Memory fallback
  const now = Date.now();
  let entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    memory.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  return {
    allowed: true,
    remaining: Math.max(0, limit - entry.count),
    retryAfterSec: 0,
  };
}
