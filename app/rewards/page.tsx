"use client";

import { Check, Lock, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { MilestoneEditor } from "@/components/MilestoneEditor";
import { PageHeader } from "@/components/PageHeader";
import { levelProgress } from "@/lib/engine";
import { useGrind } from "@/lib/useGrind";

export default function RewardsPage() {
  const g = useGrind();
  const [editing, setEditing] = useState<string | null>(null);

  if (!g.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Загрузка…
      </div>
    );
  }

  const lp = levelProgress(g.lifeXP);
  const milestones = [...g.profile.milestones].sort(
    (a, b) => a.xpTarget - b.xpTarget
  );

  return (
    <div className="min-h-screen pb-16">
      <PageHeader lifeXP={g.lifeXP} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* lifetime XP + level */}
        <div className="mb-6 rounded-2xl border border-loot/30 bg-loot/5 p-6 text-center">
          <div className="font-mono text-5xl font-bold text-loot">
            {g.lifeXP}
          </div>
          <div className="mt-1 text-sm text-slate-400">
            суммарный опыт за всё время
          </div>
          <div className="mx-auto mt-4 max-w-sm">
            <div className="mb-1 flex justify-between font-mono text-xs text-slate-400">
              <span>Уровень {lp.level}</span>
              <span>до {lp.level + 1}: {lp.toNext} XP</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-loot"
                style={{ width: `${lp.pct}%` }}
              />
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-md text-xs text-slate-500">
            Опыт копится со всех проектов. Задавай себе реальные награды на вехах —
            достигнешь порога, получишь приз. Это превращает XP в настоящую мотивацию.
          </p>
        </div>

        {/* milestone ladder */}
        <h2 className="mb-3 text-lg font-semibold text-slate-100">
          Награды-вехи
        </h2>
        <div className="space-y-2">
          {milestones.map((m) => {
            const hit = !!m.hitAt || g.lifeXP >= m.xpTarget;
            const pct = Math.min(100, Math.round((g.lifeXP / m.xpTarget) * 100));
            if (editing === m.id) {
              return (
                <MilestoneEditor
                  key={m.id}
                  initialXp={m.xpTarget}
                  initialReward={m.reward}
                  submitLabel="Сохранить"
                  onSubmit={(xpTarget, reward) => {
                    g.editMilestone(m.id, { xpTarget, reward });
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              );
            }
            return (
              <div
                key={m.id}
                className={`rounded-xl border p-3 ${
                  hit ? "border-loot/50 bg-loot/10" : "border-slate-800 bg-slate-900/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {hit ? (
                      <Check size={16} className="text-loot" />
                    ) : (
                      <Lock size={16} className="text-slate-500" />
                    )}
                    <span
                      className={`font-medium ${hit ? "text-loot" : "text-slate-200"}`}
                    >
                      {m.reward}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs text-slate-500">
                      {m.xpTarget} XP
                    </span>
                    <button
                      onClick={() => setEditing(m.id)}
                      aria-label="Изменить"
                      className="rounded p-1 text-slate-500 hover:text-slate-200"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => g.removeMilestone(m.id)}
                      aria-label="Удалить"
                      className="rounded p-1 text-slate-500 hover:text-boss"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {!hit && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-loot/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
          {milestones.length === 0 && (
            <p className="text-sm text-slate-500">
              Пока нет вех. Добавь первую награду ниже.
            </p>
          )}
        </div>

        {/* add new */}
        <h3 className="mb-2 mt-6 text-sm font-medium uppercase tracking-wider text-slate-500">
          Добавить веху
        </h3>
        <MilestoneEditor
          submitLabel="Добавить"
          onSubmit={(xpTarget, reward) => g.addMilestone(xpTarget, reward)}
        />
      </main>
    </div>
  );
}
