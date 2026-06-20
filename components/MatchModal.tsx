"use client";

import { Check, Loader2, Sparkles, X } from "lucide-react";
import { useState } from "react";
import type { Grind, Quiz } from "@/lib/types";
import { Modal } from "./Modal";

type Mode = "self" | "test";

export function MatchModal({
  grind,
  onClose,
  onConfirm,
  onFetchQuiz,
}: {
  grind: Grind;
  onClose: () => void;
  onConfirm: (name: string, score: number) => void;
  onFetchQuiz: (count?: number) => Promise<Quiz | null>;
}) {
  const suggestions = grind.tree.matches;
  const [mode, setMode] = useState<Mode>("self");

  // ---- self-assessment ----
  const [name, setName] = useState(suggestions[0]?.name ?? "Матч");
  const [score, setScore] = useState(60);

  // ---- mini-test ----
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const loadQuiz = async () => {
    setLoading(true);
    setError(false);
    const q = await onFetchQuiz(count);
    if (q) {
      setQuiz(q);
      setAnswers(new Array(q.questions.length).fill(-1));
    } else {
      setError(true);
    }
    setLoading(false);
  };

  const allAnswered = quiz != null && answers.every((a) => a >= 0);
  const correctCount =
    quiz?.questions.reduce(
      (s, q, i) => s + (answers[i] === q.correct ? 1 : 0),
      0
    ) ?? 0;
  const testScore = quiz
    ? Math.round((correctCount / quiz.questions.length) * 100)
    : 0;

  const tab = (m: Mode, label: string) => (
    <button
      onClick={() => setMode(m)}
      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
        mode === m
          ? "border-prog bg-prog/10 text-prog"
          : "border-slate-700 text-slate-300 hover:border-slate-500"
      }`}
    >
      {label}
    </button>
  );

  return (
    <Modal title="Запись матча" onClose={onClose}>
      <div className="mb-4 flex gap-2">
        {tab("self", "Самооценка")}
        {tab("test", "Мини-тест")}
      </div>

      {mode === "self" ? (
        <>
          <p className="mb-4 text-sm text-slate-400">
            Примени навык по-настоящему и поставь себе 0–100. Запись уйдёт в кривую.
          </p>

          {suggestions.length > 0 && (
            <div className="mb-4">
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                Форматы матчей
              </div>
              <div className="flex flex-col gap-2">
                {suggestions.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setName(m.name)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                      name === m.name
                        ? "border-prog bg-prog/10"
                        : "border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <div className="font-medium text-slate-100">{m.name}</div>
                    <div className="text-xs text-slate-400">{m.how}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Название
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />

          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Результат
            </label>
            <span className="font-mono text-2xl font-bold text-prog">{score}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="mb-5 w-full accent-prog"
          />

          <button
            onClick={() => onConfirm(name.trim() || "Матч", score)}
            className="w-full rounded-lg bg-prog py-3 font-semibold text-slate-950 transition hover:brightness-110"
          >
            Записать в кривую
          </button>
        </>
      ) : (
        <>
          {!quiz && (
            <div className="py-2 text-center">
              <p className="mb-4 text-sm text-slate-400">
                Сгенерируем мини-тест по тому, что ты уже закрыл
                {grind.cleared.length ? "" : " (пока узлов закрыто мало — тест будет по основам)"}.
                Результат станет очком на кривой матчей.
              </p>

              <div className="mb-4">
                <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Сколько вопросов
                </div>
                <div className="flex justify-center gap-2">
                  {[3, 5, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className={`w-16 rounded-lg border py-2 text-sm font-semibold transition ${
                        count === n
                          ? "border-prog bg-prog/10 text-prog"
                          : "border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="mb-3 text-sm text-boss">
                  Не удалось собрать тест (нужен ключ ИИ). Попробуй ещё раз.
                </p>
              )}
              <button
                onClick={loadQuiz}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-prog px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Sparkles size={18} />
                )}
                {loading ? "Собираю…" : "Сгенерировать тест"}
              </button>
            </div>
          )}

          {quiz && (
            <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
              {submitted && (
                <div className="rounded-lg border border-prog/40 bg-prog/10 p-3 text-center">
                  <div className="font-mono text-3xl font-bold text-prog">
                    {testScore}
                  </div>
                  <div className="text-xs text-slate-400">
                    {correctCount} из {quiz.questions.length} верно
                  </div>
                </div>
              )}

              {quiz.questions.map((q, qi) => (
                <div key={qi}>
                  <div className="mb-2 text-sm font-medium text-slate-100">
                    {qi + 1}. {q.q}
                  </div>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => {
                      const picked = answers[qi] === oi;
                      const isCorrect = q.correct === oi;
                      let cls = "border-slate-700 hover:border-slate-500";
                      if (submitted) {
                        if (isCorrect) cls = "border-prog/60 bg-prog/10";
                        else if (picked) cls = "border-boss/60 bg-boss/10";
                      } else if (picked) {
                        cls = "border-prog bg-prog/10";
                      }
                      return (
                        <button
                          key={oi}
                          disabled={submitted}
                          onClick={() => {
                            const next = [...answers];
                            next[qi] = oi;
                            setAnswers(next);
                          }}
                          className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm text-slate-200 transition ${cls}`}
                        >
                          {submitted && isCorrect && (
                            <Check size={14} className="shrink-0 text-prog" />
                          )}
                          {submitted && picked && !isCorrect && (
                            <X size={14} className="shrink-0 text-boss" />
                          )}
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                  {submitted && q.explain && (
                    <div className="mt-1.5 text-xs text-slate-400">{q.explain}</div>
                  )}
                </div>
              ))}

              {!submitted ? (
                <button
                  onClick={() => setSubmitted(true)}
                  disabled={!allAnswered}
                  className="w-full rounded-lg bg-prog py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
                >
                  Завершить
                </button>
              ) : (
                <button
                  onClick={() => onConfirm("Мини-тест", testScore)}
                  className="w-full rounded-lg bg-prog py-3 font-semibold text-slate-950 transition hover:brightness-110"
                >
                  Записать {testScore} в кривую
                </button>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
