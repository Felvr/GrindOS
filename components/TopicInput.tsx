"use client";

import { ArrowLeft, Loader2, Sparkles, WifiOff } from "lucide-react";
import { useState } from "react";
import { offlineFromPlan, offlineTree } from "@/lib/offline";
import type { DifficultyRequest, GeneratedTree } from "@/lib/types";
import { ThemeMenu } from "./ThemeMenu";

const DIFFS: { value: DifficultyRequest; label: string; hint: string }[] = [
  { value: "auto", label: "Авто", hint: "ИИ решит" },
  { value: "easy", label: "Лёгкая", hint: "3–4 квеста" },
  { value: "medium", label: "Средняя", hint: "5–6 квестов" },
  { value: "hard", label: "Сложная", hint: "7–9 квестов" },
];

type Mode = "topic" | "plan";

export function TopicInput({
  onTree,
  onExit,
  canExit,
}: {
  onTree: (gen: GeneratedTree) => void;
  onExit: () => void;
  canExit: boolean;
}) {
  const [mode, setMode] = useState<Mode>("topic");
  const [topic, setTopic] = useState("");
  const [plan, setPlan] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyRequest>("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate =
    mode === "topic" ? !!topic.trim() : !!plan.trim();

  const generate = async () => {
    if (!canGenerate || loading) return;
    setLoading(true);
    setError(null);
    try {
      const body =
        mode === "plan"
          ? { topic: topic.trim(), plan: plan.trim(), difficulty }
          : { topic: topic.trim(), difficulty };
      const res = await fetch("/api/generate-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const gen: GeneratedTree = await res.json();
      onTree(gen);
    } catch (e) {
      setError("Не удалось сгенерировать дерево.");
    } finally {
      setLoading(false);
    }
  };

  const buildOffline = () => {
    if (mode === "plan" && plan.trim()) {
      onTree(offlineFromPlan(topic.trim(), plan.trim(), difficulty));
    } else {
      onTree(offlineTree(topic.trim() || "Новая тема", difficulty));
    }
  };

  const samples = ["Испанский с нуля", "Теория графов", "Сдать диплом к пятнице"];

  return (
    <div className="relative mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-4 py-10">
      <div className="absolute left-4 top-4">
        <button
          onClick={onExit}
          disabled={!canExit}
          aria-label="Выйти из создания проекта"
          title={canExit ? "Вернуться к текущему проекту" : "Сначала создай проект"}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-700 disabled:hover:text-slate-300"
        >
          <ArrowLeft size={16} /> Выйти
        </button>
      </div>
      <div className="absolute right-4 top-4">
        <ThemeMenu />
      </div>
      <h1 className="mb-2 text-center text-3xl font-bold tracking-tight text-slate-100">
        Grind<span className="text-prog">OS</span>
      </h1>
      <p className="mb-6 text-center text-slate-400">
        Вбей тему или вставь готовый план — система построит дерево прогрессии,
        и ты начнёшь видеть, как растёт скилл.
      </p>

      {/* mode: topic vs ready plan */}
      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setMode("topic")}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
            mode === "topic"
              ? "border-prog bg-prog/10 text-prog"
              : "border-slate-700 text-slate-300 hover:border-slate-500"
          }`}
        >
          Тема
        </button>
        <button
          onClick={() => setMode("plan")}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
            mode === "plan"
              ? "border-prog bg-prog/10 text-prog"
              : "border-slate-700 text-slate-300 hover:border-slate-500"
          }`}
        >
          Готовый план
        </button>
      </div>

      <label htmlFor="topic" className="mb-2 text-sm font-medium text-slate-300">
        {mode === "plan" ? "Заголовок (необязательно)" : "Что качаем?"}
      </label>
      <div data-tour="topic" className="flex flex-col gap-3 sm:flex-row">
        <input
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && mode === "topic" && generate()}
          placeholder={mode === "plan" ? "напр. Запуск пет-проекта" : "напр. бэкенд на Go"}
          disabled={loading}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-prog"
        />
        <button
          onClick={generate}
          disabled={loading || !canGenerate}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-prog px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Sparkles size={18} />
          )}
          {loading ? "Строю…" : "Сгенерировать"}
        </button>
      </div>

      {mode === "plan" && (
        <div className="mt-3">
          <label htmlFor="plan" className="mb-1 block text-sm font-medium text-slate-300">
            Твой план (по пунктам)
          </label>
          <textarea
            id="plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            rows={6}
            placeholder={"1. Собрать требования\n2. Сверстать макет\n3. Подключить API\n4. Тесты\n5. Релиз"}
            disabled={loading}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-prog"
          />
          <p className="mt-1 text-xs text-slate-500">
            ИИ разнесёт пункты по узлам/тирам и пометит финал боссом.
          </p>
        </div>
      )}

      {/* difficulty → controls how many quests */}
      <div data-tour="difficulty" className="mt-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
          Сложность
        </div>
        <div className="grid grid-cols-4 gap-2">
          {DIFFS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={`rounded-lg border px-2 py-2 text-center transition ${
                difficulty === d.value
                  ? "border-prog bg-prog/10 text-prog"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              <div className="text-sm font-semibold">{d.label}</div>
              <div className="text-[10px] opacity-70">{d.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {mode === "topic" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {samples.map((s) => (
            <button
              key={s}
              onClick={() => setTopic(s)}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-lg border border-boss/40 bg-boss/10 p-4 text-sm">
          <p className="mb-3 text-boss">{error}</p>
          <button
            onClick={buildOffline}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 font-medium text-slate-100 hover:bg-slate-700"
          >
            <WifiOff size={16} /> Собрать офлайн
          </button>
        </div>
      )}
    </div>
  );
}
