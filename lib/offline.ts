import type {
  Difficulty,
  DifficultyRequest,
  GeneratedTree,
  MatchSuggestion,
  TreeNode,
} from "./types";

// Generic, connected spine of stages. We slice to the difficulty's length so the
// offline draft is always a clear step-by-step chain (no orphan islands).
const STAGES: Array<Omit<TreeNode, "tier" | "step" | "requires">> = [
  { id: "basics", name: "Основы и термины", xp: 100, grind: "Каждый заход: разбирай и записывай 5 базовых понятий темы.", unlock: "Понимаю базовый словарь и о чём вообще речь." },
  { id: "core", name: "Ключевой приём", xp: 120, grind: "Повторяй центральное действие/упражнение темы по 10 раз.", unlock: "Уверенно выполняю базовое действие сам." },
  { id: "practice", name: "Практика на примерах", xp: 140, grind: "Решай/делай по 3 небольших примера за заход.", unlock: "Решаю типовые задачи без подсказок." },
  { id: "combine", name: "Связки и комбо", xp: 160, grind: "Соединяй два приёма в одной задаче, по 3 связки за заход.", unlock: "Комбинирую приёмы для задач посложнее." },
  { id: "speed", name: "Скорость и чистота", xp: 170, grind: "Делай то же, но на время — фиксируй темп каждого захода.", unlock: "Делаю быстро и без грубых ошибок." },
  { id: "depth", name: "Глубина и нюансы", xp: 180, grind: "Разбирай по 1 сложному краевому случаю за заход.", unlock: "Справляюсь с нетипичными ситуациями." },
  { id: "apply", name: "Реальное применение", xp: 200, grind: "Применяй навык в настоящей задаче и разбирай результат.", unlock: "Применяю навык в реальной ситуации." },
  { id: "polish", name: "Полировка", xp: 200, grind: "Находи и устраняй свои частые ошибки, по 1 за заход.", unlock: "Качество стабильно высокое." },
  { id: "mastery", name: "Мастерство", xp: 200, grind: "Объясняй/учи кого-то и решай задачи экспертного уровня.", unlock: "Владею темой свободно, могу учить других." },
];

const LENGTH: Record<Difficulty, number> = { easy: 4, medium: 6, hard: 8 };

export function offlineTree(
  topic: string,
  requested: DifficultyRequest = "auto"
): GeneratedTree {
  const t = topic.trim() || "Новая тема";
  const difficulty: Difficulty = requested === "auto" ? "medium" : requested;
  const count = LENGTH[difficulty];

  const nodes: TreeNode[] = STAGES.slice(0, count).map((s, i) => ({
    ...s,
    tier: Math.min(4, Math.ceil((i + 1) / 2)),
    step: i + 1,
    requires: i === 0 ? [] : [STAGES[i - 1].id],
  }));

  const matches: MatchSuggestion[] = [
    { atTier: 2, name: "Мини-проверка", how: "Сделай задачу без подсказок и оцени себя 0–100." },
    { atTier: 4, name: "Боевое применение", how: "Примени навык в реальном деле, оцени результат 0–100." },
  ];

  return {
    type: "skill",
    difficulty,
    title: t,
    summary: `Черновик дерева по теме «${t}». Сгенерировано офлайн — отредактируй цели по ходу.`,
    draft: true,
    nodes,
    matches,
  };
}

// Offline fallback for a pasted plan: each non-empty line → one quest, linear
// chain as a project (last = boss). Used when no LLM key is configured.
export function offlineFromPlan(
  title: string,
  plan: string,
  requested: DifficultyRequest = "auto"
): GeneratedTree {
  const lines = plan
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 9);

  const difficulty: Difficulty = requested === "auto" ? "medium" : requested;
  const t = title.trim() || "Проект по плану";

  if (!lines.length) return offlineTree(t, difficulty);

  const nodes: TreeNode[] = lines.map((line, i) => ({
    id: `p${i + 1}`,
    name: line.length > 40 ? line.slice(0, 39) + "…" : line,
    tier: Math.min(4, Math.ceil((i + 1) / Math.ceil(lines.length / 4))),
    step: i + 1,
    requires: i === 0 ? [] : [`p${i}`],
    grind: line,
    xp: 120,
    unlock: `Шаг выполнен: ${line.length > 30 ? line.slice(0, 29) + "…" : line}`,
    boss: i === lines.length - 1,
  }));

  return {
    type: "project",
    difficulty,
    title: t,
    summary: `Проект собран из твоего плана (${lines.length} шагов). Офлайн-черновик.`,
    draft: true,
    nodes,
    matches: [
      { atTier: 2, name: "Промежуточная проверка", how: "Проверь готовность текущего этапа, оцени 0–100." },
    ],
  };
}
