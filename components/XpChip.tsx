"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { levelProgress } from "@/lib/engine";

// Always-visible "why XP matters": account level + lifetime XP, links to /rewards.
export function XpChip({ lifeXP }: { lifeXP: number }) {
  const { level, pct } = levelProgress(lifeXP);
  return (
    <Link
      href="/character"
      title="Персонаж: уровень, статы, прогресс"
      data-tour="level"
      className="flex items-center gap-2 rounded-lg border border-loot/40 bg-loot/5 px-2.5 py-1.5 hover:bg-loot/10"
    >
      <Star size={14} className="text-loot" />
      <div className="leading-tight">
        <div className="font-mono text-xs font-bold text-loot">Ур. {level}</div>
        <div className="h-1 w-12 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full bg-loot" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="hidden font-mono text-xs text-slate-400 sm:inline">
        {lifeXP} XP
      </span>
    </Link>
  );
}
