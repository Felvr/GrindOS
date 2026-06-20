"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { CharacterFigure } from "@/components/CharacterFigure";
import { DailyHeatmap } from "@/components/DailyHeatmap";
import { PageHeader } from "@/components/PageHeader";
import { levelProgress } from "@/lib/engine";
import { computeStats, dailyXP, dayKey } from "@/lib/stats";
import { loadAllGrinds, loadProfile, resolveBetsStore } from "@/lib/store";
import type { Grind, Profile } from "@/lib/types";

type Range = "day" | "week" | "month" | "all";
const RANGES: { key: Range; label: string; days: number }[] = [
  { key: "day", label: "День", days: 1 },
  { key: "week", label: "Неделя", days: 7 },
  { key: "month", label: "Месяц", days: 30 },
  { key: "all", label: "Всё время", days: 0 },
];
const DAY_MS = 86_400_000;

function sinceFor(range: Range): number {
  if (range === "all") return 0;
  if (range === "day") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  const days = range === "week" ? 7 : 30;
  return Date.now() - days * DAY_MS;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="font-mono text-2xl font-bold text-slate-100">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

export default function CharacterPage() {
  const [grinds, setGrinds] = useState<Grind[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [range, setRange] = useState<Range>("all");

  useEffect(() => {
    resolveBetsStore(); // settle any due account bets first
    setGrinds(loadAllGrinds());
    setProfile(loadProfile());
  }, []);

  const stats = useMemo(
    () => (grinds && profile ? computeStats(grinds, profile, sinceFor(range)) : null),
    [grinds, profile, range]
  );

  const daily = useMemo(() => (grinds ? dailyXP(grinds) : new Map<string, number>()), [grinds]);

  const bars = useMemo(() => {
    const span = RANGES.find((r) => r.key === range)!.days || 90;
    const arr: { d: string; xp: number }[] = [];
    const today = new Date();
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      arr.push({ d: `${d.getDate()}.${d.getMonth() + 1}`, xp: daily.get(dayKey(d.getTime())) ?? 0 });
    }
    return arr;
  }, [daily, range]);

  if (!stats) {
    return (
      <div className="min-h-screen">
        <PageHeader lifeXP={0} />
      </div>
    );
  }

  const lp = levelProgress(stats.lifeXP);

  return (
    <div className="min-h-screen pb-16">
      <PageHeader lifeXP={stats.lifeXP} />
      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* hero: figure + level */}
        <div className="mb-6 flex flex-col items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:flex-row sm:items-center sm:gap-8">
          <CharacterFigure level={stats.level} />
          <div className="flex-1 text-center sm:text-left">
            <div className="font-mono text-4xl font-bold text-prog">
              Уровень {stats.level}
            </div>
            <div className="mt-1 text-sm text-slate-400">
              {stats.lifeXP} XP · до {stats.level + 1}: {lp.toNext} XP
            </div>
            <div className="mt-3 h-2.5 max-w-xs overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-prog" style={{ width: `${lp.pct}%` }} />
            </div>
            <div className="mt-4 flex justify-center gap-4 text-sm sm:justify-start">
              <span className="text-loot">🔥 серия {stats.streak} дн</span>
              <span className="text-slate-400">рекорд {stats.longestStreak} дн</span>
            </div>
          </div>
        </div>

        {/* period selector — applies to the stats/activity below (not the level) */}
        <div className="mb-5 flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                range === r.key
                  ? "border-prog bg-prog/10 text-prog"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* SPECIAL-like stats */}
        <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-slate-500">
          Прокачанные статы
        </h2>
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.special.map((s) => (
            <div key={s.key} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-slate-100">{s.label}</span>
                <span className="font-mono text-lg font-bold text-prog">{s.value}/10</span>
              </div>
              <div className="my-2 h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-prog" style={{ width: `${s.value * 10}%` }} />
              </div>
              <div className="text-xs text-slate-500">{s.raw}</div>
            </div>
          ))}
        </div>

        {/* daily activity */}
        <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-slate-500">
          Прогресс по дням
        </h2>
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <DailyHeatmap daily={daily} />
        </div>
        <div className="mb-6 h-[140px] rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
              <XAxis dataKey="d" stroke="rgb(var(--slate-600))" fontSize={10} tickLine={false} interval={Math.max(0, Math.ceil(bars.length / 10) - 1)} />
              <Tooltip
                cursor={{ fill: "rgb(var(--slate-800))" }}
                contentStyle={{
                  background: "rgb(var(--slate-900))",
                  border: "1px solid rgb(var(--slate-700))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v} XP`, "за день"]}
              />
              <Bar dataKey="xp" fill="rgb(var(--prog))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* totals */}
        <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-slate-500">
          Всего
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="минут в фокусе" value={stats.focusMinutes} />
          <StatCard label="заходов" value={stats.reps} />
          <StatCard label="шагов закрыто" value={stats.nodesCleared} />
          <StatCard label="проектов" value={stats.grindsCount} />
          <StatCard label="дней активности" value={stats.daysActive} />
          <StatCard label="матчей" value={stats.matchesCount} />
          <StatCard label="ставок выиграно" value={stats.betsWon} />
          <StatCard label="ставок проиграно" value={stats.betsLost} />
        </div>
      </main>
    </div>
  );
}
