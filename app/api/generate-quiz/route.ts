import { NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";
import { anonId, estimateCostUsd, log } from "@/lib/logger";
import { extractJson } from "@/lib/normalize";
import { clientIp, rateLimit, reserveLlmCall } from "@/lib/ratelimit";
import type { Quiz, QuizQuestion } from "@/lib/types";

export const runtime = "nodejs";

function buildSystem(count: number): string {
  return `Ты — экзаменатор. По теме и списку освоенных шагов составь короткий тест на ПРОВЕРКУ ПОНИМАНИЯ. Верни ТОЛЬКО минифицированный JSON. На русском, кратко.

Требования: РОВНО ${count} вопросов с одним верным ответом. У каждого вопроса 3–4 варианта. correct — индекс верного варианта (с 0). explain — короткое пояснение почему. Вопросы практические, не на зубрёжку.

Схема:
{"questions":[{"q":"","options":["",""],"correct":0,"explain":""}]}

Только JSON, без markdown и пояснений.`;
}

function normalizeQuiz(parsed: any, count: number): Quiz {
  const raw: any[] = Array.isArray(parsed?.questions) ? parsed.questions : [];
  const questions: QuizQuestion[] = raw
    .slice(0, count)
    .map((it) => {
      const options = (Array.isArray(it?.options) ? it.options : [])
        .filter((o: unknown) => typeof o === "string" && o.trim())
        .map((o: string) => o.trim())
        .slice(0, 4);
      let correct = Math.round(Number(it?.correct ?? 0));
      if (!Number.isFinite(correct) || correct < 0 || correct >= options.length) {
        correct = 0;
      }
      return {
        q: typeof it?.q === "string" ? it.q.trim() : "",
        options,
        correct,
        explain: typeof it?.explain === "string" ? it.explain.trim() : undefined,
      } as QuizQuestion;
    })
    .filter((q) => q.q && q.options.length >= 2);
  return { questions };
}

export async function POST(req: Request) {
  let topic = "";
  let focus = "";
  let count = 5;
  try {
    const b = await req.json();
    topic = typeof b?.topic === "string" ? b.topic.trim().slice(0, 200) : "";
    focus = typeof b?.focus === "string" ? b.focus.trim().slice(0, 2000) : "";
    if (Number.isFinite(Number(b?.count))) {
      count = Math.max(3, Math.min(12, Math.round(Number(b.count))));
    }
  } catch {
    /* ignore */
  }

  if (!topic) {
    return NextResponse.json({ error: "topic required" }, { status: 400 });
  }

  const gid = anonId(req);
  const rl = rateLimit(`quiz:${clientIp(req)}`, 15, 5 * 60_000);
  if (!rl.ok) {
    log({ kind: "llm", route: "quiz", gid, blocked: "ratelimit" });
    return NextResponse.json(
      { error: "Слишком часто — попробуй чуть позже." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }
  if (!reserveLlmCall()) {
    log({ kind: "llm", route: "quiz", gid, blocked: "budget" });
    return NextResponse.json({ error: "Сервис перегружен, попробуй позже." }, { status: 503 });
  }

  const t0 = Date.now();
  try {
    const r = await callLLM(
      buildSystem(count),
      `Тема: ${topic}\nОсвоенные шаги: ${focus || "(основы темы)"}\nСоставь тест ровно из ${count} вопросов по этим знаниям.`,
      Math.max(1200, count * 260)
    );
    if (r === null) {
      return NextResponse.json({ error: "no LLM key configured" }, { status: 503 });
    }

    log({
      kind: "llm",
      route: "quiz",
      gid,
      model: r.model,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      costUsd: estimateCostUsd(r.model, r.promptTokens, r.completionTokens),
      ms: Date.now() - t0,
      ok: true,
    });

    const quiz = normalizeQuiz(JSON.parse(extractJson(r.text)), count);
    if (!quiz.questions.length) {
      return NextResponse.json({ error: "empty quiz" }, { status: 502 });
    }
    return NextResponse.json(quiz);
  } catch (err) {
    log({ kind: "llm", route: "quiz", gid, ok: false, error: String(err).slice(0, 200) });
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
