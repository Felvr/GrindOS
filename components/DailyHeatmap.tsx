"use client";

import { dayKey } from "@/lib/stats";

const WEEKS = 12;
const DAYS = WEEKS * 7;

function bucket(xp: number, max: number): number {
  if (xp <= 0) return 0;
  const r = xp / Math.max(1, max);
  if (r > 0.66) return 4;
  if (r > 0.33) return 3;
  if (r > 0.1) return 2;
  return 1;
}

const SHADE = ["rgb(var(--slate-800))", "rgb(var(--prog) / 0.25)", "rgb(var(--prog) / 0.5)", "rgb(var(--prog) / 0.75)", "rgb(var(--prog))"];

// GitHub-style calendar of XP per day over the last 12 weeks.
export function DailyHeatmap({ daily }: { daily: Map<string, number> }) {
  const max = Math.max(1, ...daily.values());
  // build the last DAYS days ending today, aligned so the last column is this week
  const today = new Date();
  const cells: { key: string; xp: number }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const k = dayKey(d.getTime());
    cells.push({ key: k, xp: daily.get(k) ?? 0 });
  }
  // columns of 7 (weeks)
  const cols: { key: string; xp: number }[][] = [];
  for (let c = 0; c < WEEKS; c++) cols.push(cells.slice(c * 7, c * 7 + 7));

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto">
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((cell) => (
              <div
                key={cell.key}
                title={`${cell.key}: ${cell.xp} XP`}
                className="h-3 w-3 rounded-[3px]"
                style={{ backgroundColor: SHADE[bucket(cell.xp, max)] }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
        меньше
        {SHADE.map((s, i) => (
          <span key={i} className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: s }} />
        ))}
        больше
      </div>
    </div>
  );
}
