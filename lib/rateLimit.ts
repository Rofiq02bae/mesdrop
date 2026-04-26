/**
 * Simple in-memory rate limiter.
 * NOTE: Works per-serverless-instance. For multi-instance production
 * swap this with a Redis-based solution (e.g. Upstash).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 1;      // 1 feedback per IP per minute

// Clean up expired entries to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, WINDOW_MS * 2);

export function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    store.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  if (entry.count >= MAX_REQUESTS) return true;

  entry.count++;
  return false;
}

/** Returns seconds remaining until the rate limit resets, or 0 if not limited */
export function getRateLimitTTL(identifier: string): number {
  const entry = store.get(identifier);
  if (!entry || entry.resetAt < Date.now()) return 0;
  return Math.ceil((entry.resetAt - Date.now()) / 1000);
}
