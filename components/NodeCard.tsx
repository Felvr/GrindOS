"use client";

import { CheckCircle2, Info, Lock, Pencil, Repeat, Skull, Swords } from "lucide-react";
import { hoursLabel, isAvailable, isCleared, missingRequires } from "@/lib/engine";
import type { Grind, TreeNode } from "@/lib/types";

export function NodeCard({
  grind,
  node,
  onGrind,
  onOpen,
  editing,
  onEdit,
}: {
  grind: Grind;
  node: TreeNode;
  onGrind: (node: TreeNode) => void;
  onOpen: (node: TreeNode) => void;
  editing?: boolean;
  onEdit?: (node: TreeNode) => void;
}) {
  const cleared = isCleared(grind, node);
  const available = isAvailable(grind, node);
  const locked = !cleared && !available;
  const isBoss = !!node.boss;

  const cur = grind.progress[node.id] ?? 0;
  const pct = Math.min(100, Math.round((cur / node.xp) * 100));

  const border = cleared
    ? "border-loot/50"
    : isBoss
    ? "border-boss/60"
    : available
    ? "border-prog/50"
    : "border-slate-800";

  const stateIcon = cleared ? (
    <CheckCircle2 size={16} className="text-loot" />
  ) : isBoss ? (
    <Skull size={16} className="text-boss" />
  ) : locked ? (
    <Lock size={16} className="text-slate-500" />
  ) : (
    <Swords size={16} className="text-prog" />
  );

  // The whole card opens the quest detail; action buttons stop propagation.
  const open = () => onOpen(node);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className={`flex cursor-pointer flex-col rounded-xl border bg-slate-900/60 p-3 transition hover:border-slate-600 ${border} ${
        locked ? "opacity-60" : ""
      }`}
    >
      <div className="mb-1 flex items-start gap-2">
        <span className="mt-0.5">{stateIcon}</span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-100">
            {node.step != null && (
              <span className="shrink-0 font-mono text-[10px] text-slate-500">
                Шаг {node.step}
              </span>
            )}
            <span>{node.name}</span>
            {node.repeatable && (
              <span
                title="Повторяемый шаг (дрилл)"
                className="inline-flex items-center gap-0.5 rounded bg-prog/15 px-1 py-0.5 text-[10px] font-medium text-prog"
              >
                <Repeat size={10} /> повтор
              </span>
            )}
            {isBoss && (
              <span className="rounded bg-boss/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-boss">
                Босс
              </span>
            )}
          </div>
        </div>
        {editing && onEdit ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(node);
            }}
            aria-label="Редактировать квест"
            className="rounded p-1 text-prog hover:bg-slate-800"
          >
            <Pencil size={15} />
          </button>
        ) : (
          <Info size={15} className="mt-0.5 shrink-0 text-slate-600" aria-hidden />
        )}
      </div>

      <p className="mb-2 text-xs leading-snug text-slate-400">{node.grind}</p>

      {/* XP bar */}
      <div className="mb-2">
        <div className="mb-1 flex justify-between font-mono text-[11px] text-slate-500">
          <span>XP · {hoursLabel(node.xp)}</span>
          <span>
            {Math.min(cur, node.xp)}/{node.xp}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${
              cleared ? "bg-loot" : isBoss ? "bg-boss" : "bg-prog"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {cleared && (
        <div className="mb-2 rounded-md bg-loot/10 px-2 py-1 text-xs text-loot">
          ✓ {node.unlock}
        </div>
      )}

      {locked ? (
        <div className="text-xs text-slate-500">
          Сначала: {missingRequires(grind, node).join(", ")}
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onGrind(node);
          }}
          className={`mt-auto rounded-lg px-3 py-2 text-sm font-semibold transition hover:brightness-110 ${
            cleared
              ? "border border-prog/40 text-prog hover:bg-prog/10"
              : isBoss
              ? "bg-boss text-slate-950"
              : "bg-prog text-slate-950"
          }`}
        >
          {cleared
            ? "Гриндить ещё"
            : isBoss
            ? "Финальный заход"
            : "Гриндить заход"}
        </button>
      )}
    </div>
  );
}
