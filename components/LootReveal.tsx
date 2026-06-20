"use client";

import { Gift } from "lucide-react";
import { RARITY_HEX, RARITY_META, type RunResult } from "@/lib/engine";
import { Modal } from "./Modal";

export function LootReveal({
  result,
  unlockedNames,
  clearedName,
  onClose,
}: {
  result: RunResult;
  unlockedNames: string[];
  clearedName: string | null;
  onClose: () => void;
}) {
  const meta = RARITY_META[result.loot.rarity];
  const color = RARITY_HEX[result.loot.rarity];
  const colorSoft = `rgb(var(--rarity-${result.loot.rarity}) / 0.13)`;

  return (
    <Modal title="Вскрытие лута" onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <div
          className="animate-chest-pop mb-3 flex h-20 w-20 items-center justify-center rounded-2xl"
          style={{ backgroundColor: colorSoft, border: `2px solid ${color}` }}
        >
          <Gift size={40} style={{ color }} />
        </div>
        <div
          className="font-mono text-xl font-bold uppercase tracking-wider"
          style={{ color }}
        >
          {meta.label}
        </div>

        <div className="mt-4 grid w-full grid-cols-2 gap-2 font-mono text-sm">
          <div className="rounded-lg bg-slate-800/50 px-3 py-2">
            <div className="text-xs text-slate-500">базовый</div>
            <div className="font-bold text-prog">+{result.base}</div>
          </div>
          <div className="rounded-lg bg-slate-800/50 px-3 py-2">
            <div className="text-xs text-slate-500">бонус ×{result.loot.mult}</div>
            <div className="font-bold text-loot">+{result.loot.bonus}</div>
          </div>
        </div>
        <div className="mt-2 font-mono text-sm text-slate-300">
          итого <span className="font-bold text-slate-100">+{result.gain} XP</span>
        </div>

        {clearedName && (
          <div className="animate-rise mt-4 w-full rounded-lg border border-loot/50 bg-loot/10 px-3 py-2 text-sm text-loot">
            🏁 Узел закрыт: <b>{clearedName}</b>
          </div>
        )}
        {unlockedNames.length > 0 && (
          <div className="animate-rise mt-2 w-full rounded-lg border border-prog/40 bg-prog/10 px-3 py-2 text-sm text-prog">
            🔓 Открыто: {unlockedNames.join(", ")}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-slate-700 py-2.5 font-semibold text-slate-100 hover:bg-slate-600"
        >
          Забрать
        </button>
      </div>
    </Modal>
  );
}
