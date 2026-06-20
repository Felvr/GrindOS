"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MatchRecord } from "@/lib/types";

// CS loop: a rising line = proof of growth (spec §3)
export function MatchCurve({ matches }: { matches: MatchRecord[] }) {
  const data = matches.map((m, i) => ({ i: i + 1, score: m.score, name: m.name }));

  if (data.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-center text-xs text-slate-500">
        Нет матчей. Жми «+ матч», когда применишь навык по-настоящему.
      </div>
    );
  }

  return (
    <div className="h-[120px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--slate-800))" />
          <XAxis dataKey="i" stroke="rgb(var(--slate-600))" fontSize={10} tickLine={false} />
          <YAxis domain={[0, 100]} stroke="rgb(var(--slate-600))" fontSize={10} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "rgb(var(--slate-900))",
              border: "1px solid rgb(var(--slate-700))",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(l) => `Матч #${l}`}
            formatter={(v: number, _n, p: any) => [`${v}`, p?.payload?.name || "счёт"]}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="rgb(var(--prog))"
            strokeWidth={2}
            dot={{ r: 3, fill: "rgb(var(--prog))" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
