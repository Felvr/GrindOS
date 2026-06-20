import { NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";
import { extractJson } from "@/lib/normalize";
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
    topic = typeof b?.topic === "string" ? b.topic.trim() : "";
    focus = typeof b?.focus === "string" ? b.focus.trim() : "";
    if (Number.isFinite(Number(b?.count))) {
      count = Math.max(3, Math.min(12, Math.round(Number(b.count))));
    }
  } catch {
    /* ignore */
  }

  if (!topic) {
    return NextResponse.json({ error: "topic required" }, { status: 400 });
  }

  try {
    const text = await callLLM(
      buildSystem(count),
      `Тема: ${topic}\nОсвоенные шаги: ${focus || "(основы темы)"}\nСоставь тест ровно из ${count} вопросов по этим знаниям.`,
      Math.max(1200, count * 260)
    );
    if (text === null) {
      return NextResponse.json(
        { error: "no LLM key configured" },
        { status: 503 }
      );
    }

    const quiz = normalizeQuiz(JSON.parse(extractJson(text)), count);
    if (!quiz.questions.length) {
      return NextResponse.json({ error: "empty quiz" }, { status: 502 });
    }
    return NextResponse.json(quiz);
  } catch (err) {
    console.error("generate-quiz failed:", err);
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
