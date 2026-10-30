// Best-effort fixed-window rate limiter kept in process memory. On serverless
// hosts each instance has its own counters, so this blunts casual abuse and
// scripted floods rather than guaranteeing a global limit.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 5000;

// Callers control the left side of x-forwarded-for: CloudFront and most proxies
// append the address they saw to whatever the client sent, so the first entry
// can be rotated per request to dodge the limiter. Prefer headers the edge sets
// itself, then the rightmost entry, which is the one our own proxy appended.
export function clientKey(req: Request): string {
  const vercel = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;

  // CloudFront-Viewer-Address is "ip:port" (IPv6 addresses contain colons too,
  // so the port is whatever follows the last one).
  const viewer = req.headers.get("cloudfront-viewer-address")?.trim();
  if (viewer) {
    const colon = viewer.lastIndexOf(":");
    return colon > 0 ? viewer.slice(0, colon) : viewer;
  }

  const forwarded = req.headers.get("x-forwarded-for");
  const last = forwarded?.split(",").pop()?.trim();
  return last || req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { ok: boolean; retryAfterSeconds: number } {
  if (buckets.size > MAX_TRACKED_KEYS) {
    buckets.forEach((b, k) => {
      if (b.resetAt <= now) buckets.delete(k);
    });
    if (buckets.size > MAX_TRACKED_KEYS) buckets.clear();
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { ok: true, retryAfterSeconds: 0 };
}
