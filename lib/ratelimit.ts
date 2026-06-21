// In-memory rate limiting + a global daily LLM-call cap. Per single Railway
// instance this is enough to stop casual abuse / ad-bot floods burning the API
// budget. (Resets on redeploy — fine for a hobby/early-stage deploy.)

interface Bucket {
  count: number;
  reset: number;
}
const buckets = new Map<string, Bucket>();

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfter: number; // seconds
}

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();

  // occasional prune so the map can't grow unbounded
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k);
  }

  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((b.reset - now) / 1000) };
  }
  b.count++;
  return { ok: true, remaining: limit - b.count, retryAfter: 0 };
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// ---- global daily LLM-call cap (hard budget guard) ----
const LLM_DAILY_CAP = Number(process.env.LLM_DAILY_CAP ?? 3000);
let capDay = "";
let capCount = 0;

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

// Reserve one LLM call against today's global cap. false = cap reached.
export function reserveLlmCall(): boolean {
  const d = utcDay();
  if (d !== capDay) {
    capDay = d;
    capCount = 0;
  }
  if (capCount >= LLM_DAILY_CAP) return false;
  capCount++;
  return true;
}

export function llmCallsToday(): number {
  return capCount;
}
export const llmDailyCap = LLM_DAILY_CAP;
