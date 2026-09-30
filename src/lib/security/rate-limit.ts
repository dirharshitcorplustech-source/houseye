/**
 * HOUSEYE.COM — Simple in-memory rate limiter
 * Good enough for single-instance / dev.
 * Production: replace with Redis-backed limiter.
 */

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  let entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(key, entry);
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

/** Cleanup stale keys occasionally */
export function pruneRateLimits() {
  const now = Date.now();
  buckets.forEach((v, k) => {
    if (v.resetAt <= now) buckets.delete(k);
  });
}
