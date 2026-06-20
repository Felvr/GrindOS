"use client";

import { Archive, ArchiveRestore, Skull, Trash2 } from "lucide-react";
import type { Grind } from "@/lib/types";

export function ProjectCard({
  grind,
  active,
  onOpen,
  onDelete,
  onArchive,
  onRestore,
}: {
  grind: Grind;
  active: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const total = grind.tree.nodes.length;
  const pct = Math.round((grind.cleared.length / Math.max(1, total)) * 100);

  return (
    <div
      className={`flex flex-col rounded-xl border bg-slate-900/60 p-4 ${
        active ? "border-prog/60" : "border-slate-800"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <button onClick={onOpen} className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-100 hover:text-prog">
              {grind.title}
            </h3>
            {active && (
              <span className="rounded-full bg-prog/15 px-2 py-0.5 text-[10px] font-bold uppercase text-prog">
                активен
              </span>
            )}
          </div>
        </button>
        <div className="flex shrink-0 items-center">
          <button
            onClick={grind.archived ? onRestore : onArchive}
            aria-label={grind.archived ? "Вернуть из архива" : "В архив"}
            title={grind.archived ? "Вернуть из архива" : "Убрать в архив"}
            className="rounded p-1 text-slate-600 hover:text-loot"
          >
            {grind.archived ? (
              <ArchiveRestore size={15} />
            ) : (
              <Archive size={15} />
            )}
          </button>
          <button
            onClick={onDelete}
            aria-label="Удалить"
            className="rounded p-1 text-slate-600 hover:text-boss"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400">
        <span className="rounded-full bg-slate-800 px-2 py-0.5">
          {grind.type === "project" ? "проект" : "навык"}
        </span>
        <span className="rounded-full bg-slate-800 px-2 py-0.5">
          {grind.difficulty}
        </span>
        {grind.archived && (
          <span className="inline-flex items-center gap-1 rounded-full bg-loot/15 px-2 py-0.5 text-loot">
            <Archive size={10} /> архив
          </span>
        )}
        {grind.type === "project" && (
          <span className="inline-flex items-center gap-1 text-boss">
            <Skull size={10} /> босс
          </span>
        )}
      </div>

      <div className="mb-1 flex justify-between font-mono text-[11px] text-slate-500">
        <span>прогресс</span>
        <span>
          {grind.cleared.length}/{total}
        </span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-prog" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-auto flex items-center justify-between font-mono text-xs">
        <span className="text-loot">{grind.earnedXP} XP</span>
        <button
          onClick={onOpen}
          className="rounded-md border border-prog/40 px-3 py-1 font-sans font-medium text-prog hover:bg-prog/10"
        >
          Открыть
        </button>
      </div>
    </div>
  );
}
