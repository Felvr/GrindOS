import { NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";
import { extractJson, normalizeTree } from "@/lib/normalize";
import { offlineFromPlan, offlineTree } from "@/lib/offline";
import type { DifficultyRequest, GeneratedTree } from "@/lib/types";

export const runtime = "nodejs";

const COUNTS: Record<string, string> = {
  auto: "сам выбери сложность и число узлов: easy 3-4, medium 5-6, hard 7-9",
  easy: "сложность easy: ровно 3-4 узла",
  medium: "сложность medium: ровно 5-6 узлов",
  hard: "сложность hard: ровно 7-9 узлов",
};

function buildSystem(diff: DifficultyRequest): string {
  return `Ты — наставник-декомпозитор. По теме/делу разбей путь на ПОШАГОВЫЙ ПЛАН реализации и верни ТОЛЬКО минифицированный JSON по схеме ниже.

Определи type: "skill" (навык) или "project" (дело с дедлайном, последний узел — босс).
Определи difficulty: "easy" | "medium" | "hard". ${COUNTS[diff] ?? COUNTS.auto}.

КЛЮЧЕВОЕ: это ПЛАН ВЫПОЛНЕНИЯ, а не набор повторяющихся упражнений.
- Узлы — конкретные ШАГИ реализации по порядку: step 1 → 2 → 3 → … (возрастание step и tier).
- Каждый узел (кроме первого) в requires ССЫЛАЕТСЯ на id предыдущего шага. Боковые ветки можно, но изолированных узлов нет. Для project — строго линейная цепочка до боса.
- grind — что КОНКРЕТНО сделать на этом шаге (<=14 слов), как пункт плана, а НЕ «повторяй N раз».
- repeatable: true ТОЛЬКО если шаг по своей сути требует повторения/тренировки (дрилл: заучивание, отработка приёма). Для обычных одноразовых шагов — false или не указывай.
- hours — РЕАЛИСТИЧНАЯ оценка часов сфокусированной работы, чтобы освоить/сделать этот шаг (число, 0.25–40). Большой шаг = больше часов. Это главный показатель объёма.
- unlock — что реально появится/будет уметь после шага (<=14 слов). name <=6 слов. matches: 2-3 шт, how <=16 слов. Весь текст на русском, кратко.

Только JSON, без markdown и пояснений.

Схема:
{"type":"skill|project","difficulty":"easy|medium|hard","title":"","summary":"","nodes":[{"id":"","name":"","tier":1,"step":1,"requires":[],"grind":"","repeatable":false,"hours":2,"unlock":""}],"matches":[{"atTier":1,"name":"","how":""}]}`;
}

export async function POST(req: Request) {
  let topic = "";
  let plan = "";
  let difficulty: DifficultyRequest = "auto";
  try {
    const body = await req.json();
    topic = typeof body?.topic === "string" ? body.topic.trim() : "";
    plan = typeof body?.plan === "string" ? body.plan.trim() : "";
    if (["auto", "easy", "medium", "hard"].includes(body?.difficulty)) {
      difficulty = body.difficulty;
    }
  } catch {
    /* ignore */
  }

  // a plan can stand in for the topic (its title is optional)
  const subject = topic || (plan ? "Проект по плану" : "");
  if (!subject) {
    return NextResponse.json({ error: "topic or plan required" }, { status: 400 });
  }

  const planDirective = plan
    ? `\n\nДан ГОТОВЫЙ ПЛАН пользователя. Структурируй ИМЕННО эти шаги: сохрани их порядок и смысл, разнеси по узлам/тирам, не выдумывай новых шагов и не выбрасывай существующие. type скорее всего "project", финал — босс. Каждый пункт плана ≈ один узел.\n\nПЛАН:\n${plan}`
    : "";

  try {
    const text = await callLLM(
      buildSystem(difficulty) + planDirective,
      plan
        ? `Заголовок: ${topic || "(придумай короткий по плану)"}\nСтруктурируй план в JSON по схеме.`
        : `Тема/дело: ${topic}\nВерни минифицированный JSON по схеме.`,
      2000
    );
    if (text === null) {
      // no provider key → graceful offline draft
      return NextResponse.json(
        plan ? offlineFromPlan(topic, plan, difficulty) : offlineTree(topic, difficulty)
      );
    }

    const parsed = JSON.parse(extractJson(text));
    const tree: GeneratedTree = normalizeTree(parsed, subject, difficulty);

    if (!tree.nodes.length) {
      return NextResponse.json(
        plan ? offlineFromPlan(topic, plan, difficulty) : offlineTree(subject, difficulty)
      );
    }
    return NextResponse.json(tree);
  } catch (err) {
    console.error("generate-tree failed:", err);
    return NextResponse.json(
      plan ? offlineFromPlan(topic, plan, difficulty) : offlineTree(subject, difficulty)
    );
  }
}
