import { NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";
import { anonId, estimateCostUsd, log } from "@/lib/logger";
import { extractJson } from "@/lib/normalize";
import { clientIp, rateLimit, reserveLlmCall } from "@/lib/ratelimit";
import type { NodeDetail } from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM = `Ты — наставник. По теме и конкретному шагу прогрессии верни ТОЛЬКО минифицированный JSON с подробным практическим разбором ЭТОГО шага. На русском, кратко и конкретно.

Схема:
{"steps":["3-6 коротких под-шагов: что делать по порядку"],"tips":["2-4 совета/типичные ошибки"],"resources":["1-3 типа ресурсов/где искать, без выдуманных ссылок"]}

Только JSON, без markdown и пояснений.`;

function asStrings(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string" && x.trim())
    .map((x) => (x as string).trim())
    .slice(0, max);
}

export async function POST(req: Request) {
  let topic = "";
  let nodeName = "";
  let grind = "";
  let unlock = "";
  try {
    const b = await req.json();
    topic = typeof b?.topic === "string" ? b.topic.trim().slice(0, 200) : "";
    nodeName = typeof b?.nodeName === "string" ? b.nodeName.trim().slice(0, 200) : "";
    grind = typeof b?.grind === "string" ? b.grind.trim().slice(0, 300) : "";
    unlock = typeof b?.unlock === "string" ? b.unlock.trim().slice(0, 300) : "";
  } catch {
    /* ignore */
  }

  if (!nodeName) {
    return NextResponse.json({ error: "nodeName required" }, { status: 400 });
  }

  const gid = anonId(req);
  const rl = rateLimit(`explain:${clientIp(req)}`, 20, 5 * 60_000);
  if (!rl.ok) {
    log({ kind: "llm", route: "explain", gid, blocked: "ratelimit" });
    return NextResponse.json(
      { error: "Слишком часто — попробуй чуть позже." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }
  if (!reserveLlmCall()) {
    log({ kind: "llm", route: "explain", gid, blocked: "budget" });
    return NextResponse.json({ error: "Сервис перегружен, попробуй позже." }, { status: 503 });
  }

  const t0 = Date.now();
  try {
    const r = await callLLM(
      SYSTEM,
      `Тема: ${topic}\nШаг: ${nodeName}\nДрилл: ${grind}\nЧто откроется: ${unlock}\nДай подробный разбор этого шага в JSON.`,
      900
    );
    if (r === null) {
      return NextResponse.json({ error: "no LLM key configured" }, { status: 503 });
    }

    log({
      kind: "llm",
      route: "explain",
      gid,
      model: r.model,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      costUsd: estimateCostUsd(r.model, r.promptTokens, r.completionTokens),
      ms: Date.now() - t0,
      ok: true,
    });

    const parsed = JSON.parse(extractJson(r.text));
    const detail: NodeDetail = {
      steps: asStrings(parsed?.steps, 6),
      tips: asStrings(parsed?.tips, 4),
      resources: asStrings(parsed?.resources, 3),
      generatedAt: Date.now(),
    };
    if (!detail.steps.length) {
      return NextResponse.json({ error: "empty detail" }, { status: 502 });
    }
    return NextResponse.json(detail);
  } catch (err) {
    log({ kind: "llm", route: "explain", gid, ok: false, error: String(err).slice(0, 200) });
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
