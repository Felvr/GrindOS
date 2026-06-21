import { NextResponse } from "next/server";
import { anonId, log } from "@/lib/logger";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const ALLOWED = new Set([
  "app_open",
  "tree_generated",
  "focus_start",
  "focus_complete",
  "quiz_done",
  "daily_open",
]);

// Lightweight engagement logging (no DB). Combine with the per-call LLM cost
// logs to estimate active users and average cost-per-user.
export async function POST(req: Request) {
  const rl = rateLimit(`track:${clientIp(req)}`, 120, 60_000);
  if (!rl.ok) return new NextResponse(null, { status: 429 });

  let event = "";
  try {
    const b = await req.json();
    event = typeof b?.event === "string" ? b.event.slice(0, 40) : "";
  } catch {
    /* sendBeacon may send text/plain — ignore parse errors */
  }
  if (!ALLOWED.has(event)) return new NextResponse(null, { status: 204 });

  log({ kind: "event", event, gid: anonId(req) });
  return new NextResponse(null, { status: 204 });
}
