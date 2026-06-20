"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { hoursLabel } from "@/lib/engine";
import type { Grind, TreeNode } from "@/lib/types";
import { Modal } from "./Modal";

export function QuestEditorModal({
  grind,
  node,
  onClose,
  onSave,
  onDelete,
}: {
  grind: Grind;
  node: TreeNode;
  onClose: () => void;
  onSave: (id: string, patch: Partial<TreeNode>) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(node.name);
  const [tier, setTier] = useState(node.tier);
  const [grindText, setGrindText] = useState(node.grind);
  const [unlock, setUnlock] = useState(node.unlock);
  const [xp, setXp] = useState(String(node.xp));
  const [repeatable, setRepeatable] = useState(!!node.repeatable);
  const [requires, setRequires] = useState<string[]>(node.requires);

  const others = grind.tree.nodes.filter((n) => n.id !== node.id);

  const toggleReq = (id: string) => {
    setRequires((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));
  };

  const save = () => {
    onSave(node.id, {
      name: name.trim() || "Шаг",
      tier,
      grind: grindText.trim() || "Что сделать на этом шаге.",
      unlock: unlock.trim() || "Что я смогу.",
      xp: Math.max(30, Math.min(3000, Math.round(Number(xp) || 100))),
      repeatable,
      requires,
    });
    onClose();
  };

  return (
    <Modal title="Редактор квеста" onClose={onClose}>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Название
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
              Тир
            </label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((t) => (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  className={`flex-1 rounded-lg border py-2 font-mono text-sm transition ${
                    tier === t
                      ? "border-prog bg-prog/10 text-prog"
                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
              XP (30–3000)
            </label>
            <input
              type="number"
              min={30}
              max={3000}
              value={xp}
              onChange={(e) => setXp(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100"
            />
            <div className="mt-1 text-[10px] text-slate-500">
              {hoursLabel(Math.max(30, Math.min(3000, Math.round(Number(xp) || 100))))} фокуса
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Шаг (что сделать)
          </label>
          <textarea
            value={grindText}
            onChange={(e) => setGrindText(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={repeatable}
              onChange={(e) => setRepeatable(e.target.checked)}
              className="h-4 w-4 accent-prog"
            />
            Повторяемый шаг (дрилл — нужно отрабатывать)
          </label>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Unlock (что смогу)
          </label>
          <textarea
            value={unlock}
            onChange={(e) => setUnlock(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
        </div>

        {others.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
              Зависит от (requires)
            </label>
            <div className="flex flex-col gap-1">
              {others.map((o) => (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800/60"
                >
                  <input
                    type="checkbox"
                    checked={requires.includes(o.id)}
                    onChange={() => toggleReq(o.id)}
                    className="h-4 w-4 accent-prog"
                  />
                  <span className="font-mono text-[10px] text-slate-500">
                    T{o.tier}
                  </span>
                  {o.name}
                </label>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Циклы и висячие связи убираются автоматически при сохранении.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => {
            if (confirm(`Удалить квест «${node.name}»?`)) {
              onDelete(node.id);
              onClose();
            }
          }}
          aria-label="Удалить квест"
          className="rounded-lg border border-boss/40 p-2.5 text-boss hover:bg-boss/10"
        >
          <Trash2 size={16} />
        </button>
        <button
          onClick={save}
          className="flex-1 rounded-lg bg-prog py-2.5 font-semibold text-slate-950 transition hover:brightness-110"
        >
          Сохранить
        </button>
      </div>
    </Modal>
  );
}
