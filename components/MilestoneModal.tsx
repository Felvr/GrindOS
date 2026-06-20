"use client";

import { Trophy } from "lucide-react";
import type { Milestone } from "@/lib/types";
import { Modal } from "./Modal";

export function MilestoneModal({
  milestones,
  onClose,
}: {
  milestones: Milestone[];
  onClose: () => void;
}) {
  return (
    <Modal title="Награда разблокирована!" onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <div
          className="animate-chest-pop mb-3 flex h-20 w-20 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: "rgb(var(--loot) / 0.13)",
            border: "2px solid rgb(var(--loot))",
          }}
        >
          <Trophy size={40} className="text-loot" />
        </div>

        <p className="mb-4 text-sm text-slate-400">
          Ты накопил достаточно опыта. Забери заслуженное:
        </p>

        <div className="w-full space-y-2">
          {milestones.map((m) => (
            <div
              key={m.id}
              className="animate-rise rounded-lg border border-loot/50 bg-loot/10 px-4 py-3"
            >
              <div className="font-mono text-xs text-loot/80">
                {m.xpTarget} XP
              </div>
              <div className="text-base font-semibold text-loot">{m.reward}</div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-loot py-2.5 font-semibold text-slate-950 hover:brightness-110"
        >
          Забрать награду
        </button>
      </div>
    </Modal>
  );
}
