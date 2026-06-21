// Structured stdout logging (Railway captures stdout). One JSON line per event,
// so logs are greppable/aggregatable for cost-per-user analysis.
type Json = Record<string, unknown>;

export function log(event: Json): void {
  try {
    console.log(JSON.stringify({ ts: new Date().toISOString(), ...event }));
  } catch {
    console.log("[log-failed]", event);
  }
}

// Approx USD per 1M tokens [input, output]. Estimates — tune to your provider.
const PRICES: Record<string, [number, number]> = {
  "google/gemini-flash-1.5": [0.075, 0.3],
  "gemini-flash": [0.075, 0.3],
  "gpt-4o-mini": [0.15, 0.6],
  "haiku": [1, 5],
  "sonnet": [3, 15],
};

export function estimateCostUsd(
  model: string,
  inTokens: number,
  outTokens: number
): number {
  const key = Object.keys(PRICES).find((k) => model.includes(k));
  const [pin, pout] = key ? PRICES[key] : [1, 3]; // conservative default
  return +(((inTokens * pin + outTokens * pout) / 1_000_000).toFixed(6));
}

// Read the anonymous visitor id set by middleware (for per-user cost attribution).
export function anonId(req: Request): string {
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)gid=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "new";
}
