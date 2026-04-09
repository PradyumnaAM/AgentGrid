const windows = new Map<string, number[]>();

/**
 * Sliding-window in-memory rate limiter.
 * Works for single-process deployments (self-hosted, Railway, Render).
 * For multi-instance deployments, replace with Redis-backed limiter (e.g. @upstash/ratelimit).
 */
export function checkRateLimit(
  key: string,
  maxRequests = 20,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const hits = (windows.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= maxRequests) return false;
  hits.push(now);
  windows.set(key, hits);
  return true;
}
