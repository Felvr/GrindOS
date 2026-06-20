import { NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";
import { extractJson } from "@/lib/normalize";
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
    topic = typeof b?.topic === "string" ? b.topic.trim() : "";
    nodeName = typeof b?.nodeName === "string" ? b.nodeName.trim() : "";
    grind = typeof b?.grind === "string" ? b.grind.trim() : "";
    unlock = typeof b?.unlock === "string" ? b.unlock.trim() : "";
  } catch {
    /* ignore */
  }

  if (!nodeName) {
    return NextResponse.json({ error: "nodeName required" }, { status: 400 });
  }

  try {
    const text = await callLLM(
      SYSTEM,
      `Тема: ${topic}\nШаг: ${nodeName}\nДрилл: ${grind}\nЧто откроется: ${unlock}\nДай подробный разбор этого шага в JSON.`,
      900
    );
    if (text === null) {
      return NextResponse.json(
        { error: "no LLM key configured" },
        { status: 503 }
      );
    }

    const parsed = JSON.parse(extractJson(text));
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
    console.error("explain-node failed:", err);
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
