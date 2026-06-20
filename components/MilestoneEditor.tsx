"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";

export function MilestoneEditor({
  initialXp = 1000,
  initialReward = "",
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialXp?: number;
  initialReward?: string;
  submitLabel: string;
  onSubmit: (xpTarget: number, reward: string) => void;
  onCancel?: () => void;
}) {
  const [xp, setXp] = useState(String(initialXp));
  const [reward, setReward] = useState(initialReward);

  const submit = () => {
    const n = Math.round(Number(xp));
    if (!Number.isFinite(n) || n <= 0 || !reward.trim()) return;
    onSubmit(n, reward.trim());
    setReward("");
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 sm:flex-row sm:items-end">
      <div className="w-full sm:w-32">
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-500">
          Порог XP
        </label>
        <input
          type="number"
          min={1}
          value={xp}
          onChange={(e) => setXp(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 focus:border-loot"
        />
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-500">
          Реальная награда
        </label>
        <input
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="напр. сходить в кино 🎬"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-loot"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-lg bg-loot px-3 py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
        >
          <Check size={15} /> {submitLabel}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            aria-label="Отмена"
            className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-slate-200"
          >
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
