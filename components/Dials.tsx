"use client";

import { Eye, Trophy, Warehouse } from "lucide-react";
import type { Grind } from "@/lib/types";
import { DropBar } from "./DropBar";
import { MatchCurve } from "./MatchCurve";

function Panel({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

export function Dials({
  grind,
  onAddMatch,
}: {
  grind: Grind;
  onAddMatch: () => void;
}) {
  const isProject = grind.type === "project";
  const garage = [...grind.garage].reverse();

  return (
    <div data-tour="dials" className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {/* Гараж / Сделано */}
      <Panel
        icon={<Warehouse size={14} className="text-loot" />}
        label={isProject ? "Сделано" : "Гараж"}
      >
        <div className="flex max-h-[160px] flex-col gap-2 overflow-y-auto pr-1">
          {garage.length === 0 && (
            <p className="text-xs text-slate-500">
              Закрытые узлы появятся здесь с подписью «теперь могу…».
            </p>
          )}
          {garage.map((g, i) => (
            <div
              key={i}
              className="animate-rise rounded-lg border border-loot/30 bg-loot/5 px-3 py-2"
            >
              <div className="text-sm font-medium text-slate-100">{g.name}</div>
              <div className="text-xs text-loot">{g.unlock}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Кривая матчей */}
      <Panel
        icon={<Trophy size={14} className="text-prog" />}
        label="Кривая матчей"
      >
        <MatchCurve matches={grind.matches} />
        <button
          onClick={onAddMatch}
          className="mt-2 self-start rounded-md border border-prog/40 px-3 py-1 text-xs font-medium text-prog hover:bg-prog/10"
        >
          + матч
        </button>
      </Panel>

      {/* Насмотренность */}
      <Panel
        icon={<Eye size={14} className="text-slate-300" />}
        label="Насмотренность"
      >
        <div className="flex items-baseline gap-3">
          <div>
            <div className="font-mono text-3xl font-bold text-slate-100">
              {grind.minutes}
            </div>
            <div className="text-xs text-slate-500">минут в фокусе</div>
          </div>
          <div>
            <div className="font-mono text-3xl font-bold text-slate-100">
              {grind.reps}
            </div>
            <div className="text-xs text-slate-500">заходов</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-1 text-xs text-slate-500">последние дропы</div>
          <DropBar lootLog={grind.lootLog} />
        </div>
      </Panel>
    </div>
  );
}
