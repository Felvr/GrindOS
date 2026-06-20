"use client";

import { Smartphone, SmartphoneNfc } from "lucide-react";
import { useState } from "react";
import { computeBase } from "@/lib/engine";
import type { TreeNode } from "@/lib/types";
import { Modal } from "./Modal";

const LENGTHS = [
  { min: 15, label: "Патруль", sub: "15 мин" },
  { min: 25, label: "Данж", sub: "25 мин" },
  { min: 50, label: "Рейд", sub: "50 мин" },
];

export function RunModal({
  node,
  onClose,
  onConfirm,
  onStartTimer,
}: {
  node: TreeNode;
  onClose: () => void;
  onConfirm: (minutes: number, phoneFree: boolean) => void; // instant credit
  onStartTimer: (minutes: number, phoneFree: boolean) => void; // hand off to focus timer
}) {
  const [minutes, setMinutes] = useState(25);
  const [phoneFree, setPhoneFree] = useState(true);
  const base = computeBase(minutes, phoneFree);

  return (
    <Modal title={`Заход: ${node.name}`} onClose={onClose}>
      <p className="mb-4 text-sm text-slate-400">{node.grind}</p>

      <div className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
        Длина
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {LENGTHS.map((l) => (
          <button
            key={l.min}
            onClick={() => setMinutes(l.min)}
            className={`rounded-lg border px-2 py-3 text-center transition ${
              minutes === l.min
                ? "border-prog bg-prog/10 text-prog"
                : "border-slate-700 text-slate-300 hover:border-slate-500"
            }`}
          >
            <div className="text-sm font-semibold">{l.label}</div>
            <div className="font-mono text-xs opacity-70">{l.sub}</div>
          </button>
        ))}
      </div>

      <button
        onClick={() => setPhoneFree((v) => !v)}
        className={`mb-4 flex w-full items-center justify-between rounded-lg border px-4 py-3 transition ${
          phoneFree ? "border-loot/50 bg-loot/10" : "border-slate-700 bg-slate-800/40"
        }`}
        aria-pressed={phoneFree}
      >
        <span className="flex items-center gap-2 text-sm text-slate-200">
          {phoneFree ? (
            <SmartphoneNfc size={18} className="text-loot" />
          ) : (
            <Smartphone size={18} className="text-slate-400" />
          )}
          Телефон убран?
        </span>
        <span
          className={`font-mono text-sm font-bold ${
            phoneFree ? "text-loot" : "text-slate-400"
          }`}
        >
          {phoneFree ? "ДА ×2" : "нет ×1"}
        </span>
      </button>

      <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-800/40 px-4 py-2 font-mono text-sm">
        <span className="text-slate-400">базовый XP за сессию</span>
        <span className="font-bold text-prog">+{base}</span>
      </div>

      <button
        onClick={() => onStartTimer(minutes, phoneFree)}
        className="mb-2 w-full rounded-lg bg-prog py-3 font-semibold text-slate-950 transition hover:brightness-110"
      >
        Старт фокуса ▶
      </button>
      <button
        onClick={() => onConfirm(minutes, phoneFree)}
        className="w-full rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-300 hover:border-slate-500 hover:text-slate-100"
      >
        Засчитать без таймера
      </button>
    </Modal>
  );
}
