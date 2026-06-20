import { totalBalanceXP, totalEarnedXP, xpToLevel } from "./engine";
import type { Grind, Profile } from "./types";

// local YYYY-MM-DD key for a timestamp
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// XP earned per local day across all grinds (from run history).
export function dailyXP(grinds: Grind[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const g of grinds) {
    for (const r of g.runLog ?? []) {
      const k = dayKey(r.t);
      m.set(k, (m.get(k) ?? 0) + r.gain);
    }
  }
  return m;
}

function streaks(activeDays: Set<string>): { current: number; longest: number } {
  if (activeDays.size === 0) return { current: 0, longest: 0 };
  const DAY = 86_400_000;
  // longest run of consecutive days
  const sorted = [...activeDays].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]).getTime();
    const cur = new Date(sorted[i]).getTime();
    run = Math.round((cur - prev) / DAY) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  // current streak ending today (or yesterday)
  let current = 0;
  let cursor = Date.now();
  if (!activeDays.has(dayKey(cursor))) cursor -= DAY; // allow today not yet done
  while (activeDays.has(dayKey(cursor))) {
    current++;
    cursor -= DAY;
  }
  return { current, longest };
}

export interface SpecialStat {
  key: string;
  label: string;
  value: number; // 1..10
  raw: string;
}

export interface CharacterStats {
  level: number;
  lifeXP: number; // spendable balance
  earnedXP: number; // monotonic
  focusMinutes: number;
  reps: number;
  nodesCleared: number;
  grindsCount: number;
  matchesCount: number;
  avgMatch: number;
  betsWon: number;
  betsLost: number;
  daysActive: number;
  streak: number;
  longestStreak: number;
  special: SpecialStat[];
}

const clamp10 = (n: number) => Math.max(1, Math.min(10, Math.round(n)));

// sinceTs = 0 → all-time; otherwise period metrics count only events after it.
// Account-level numbers (level, lifeXP, earnedXP) are always all-time.
export function computeStats(
  grinds: Grind[],
  profile: Profile,
  sinceTs = 0
): CharacterStats {
  const inRange = (t: number | undefined) => (t ?? 0) >= sinceTs;

  const lifeXP = Math.max(0, totalBalanceXP(grinds) + (profile.xpAdjust ?? 0));
  const earnedXP = totalEarnedXP(grinds);

  // period-bound metrics derived from per-event timestamps
  const periodRuns = grinds.flatMap((g) => (g.runLog ?? []).filter((r) => inRange(r.t)));
  const focusMinutes = periodRuns.reduce((s, r) => s + (r.minutes ?? 0), 0);
  const reps = periodRuns.length;
  const nodesCleared = grinds.reduce(
    (s, g) => s + (g.garage ?? []).filter((e) => inRange(e.t)).length,
    0
  );

  const allMatches = grinds.flatMap((g) => (g.matches ?? []).filter((m) => inRange(m.t)));
  const matchesCount = allMatches.length;
  const avgMatch = matchesCount
    ? Math.round(allMatches.reduce((s, m) => s + m.score, 0) / matchesCount)
    : 0;

  const betsWon = profile.bets.filter((b) => b.status === "won" && inRange(b.resolvedAt)).length;
  const betsLost = profile.bets.filter((b) => b.status === "lost" && inRange(b.resolvedAt)).length;

  const avgGain = periodRuns.length
    ? periodRuns.reduce((s, r) => s + r.gain, 0) / periodRuns.length
    : 0;

  const days = new Set(periodRuns.map((r) => dayKey(r.t)));
  // streaks are habit metrics → always computed over all activity
  const { current, longest } = streaks(new Set([...dailyXP(grinds).keys()]));

  const special: SpecialStat[] = [
    { key: "focus", label: "Фокус", value: clamp10(focusMinutes / 90), raw: `${focusMinutes} мин` },
    { key: "discipline", label: "Дисциплина", value: clamp10(longest), raw: `${longest} дн подряд` },
    { key: "erudition", label: "Эрудиция", value: clamp10(nodesCleared / 2), raw: `${nodesCleared} шагов` },
    { key: "tempo", label: "Темп", value: clamp10(avgGain / 30), raw: `${Math.round(avgGain)} XP/заход` },
    { key: "aim", label: "Меткость", value: clamp10(avgMatch / 10), raw: matchesCount ? `${avgMatch}/100` : "нет матчей" },
    { key: "grit", label: "Упорство", value: clamp10(reps / 5), raw: `${reps} заходов` },
  ];

  return {
    level: xpToLevel(lifeXP),
    lifeXP,
    earnedXP,
    focusMinutes,
    reps,
    nodesCleared,
    grindsCount: grinds.length,
    matchesCount,
    avgMatch,
    betsWon,
    betsLost,
    daysActive: days.size,
    streak: current,
    longestStreak: longest,
    special,
  };
}
