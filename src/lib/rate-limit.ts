type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function rateLimit(
  key: string,
  maxRequests = 30,
  windowMs = 60000
): { ok: boolean; remaining: number; resetMs: number } {
  const now = Date.now()
  let bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs }
    buckets.set(key, bucket)
  }

  bucket.count += 1
  const remaining = Math.max(0, maxRequests - bucket.count)
  const resetMs = bucket.resetAt - now
  const ok = bucket.count <= maxRequests

  return { ok, remaining, resetMs }
}

// Periodic cleanup of expired buckets to prevent memory growth
if (typeof setInterval !== 'undefined') {
  const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
  const interval = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) {
        buckets.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)
  // Don't keep the process alive solely for cleanup
  if (typeof interval === 'object' && interval && 'unref' in interval) {
    ;(interval as { unref: () => void }).unref()
  }
}
