"use client";

import { Timer, TrendingUp } from "lucide-react";
import { useState } from "react";
import { BET_WIN_BONUS } from "@/lib/engine";
import type { Bet, TreeNode } from "@/lib/types";

const DEADLINES = [
  { label: "1 день", ms: 86_400_000 },
  { label: "3 дня", ms: 3 * 86_400_000 },
  { label: "неделя", ms: 7 * 86_400_000 },
];

function leftLabel(deadline: number): string {
  const ms = deadline - Date.now();
  if (ms <= 0) return "истёк";
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `${h} ч`;
  return `${Math.floor(h / 24)} дн`;
}

// Humane wager: stake account XP that this node gets cleared by a deadline.
export function BetSection({
  slug,
  node,
  balance,
  bets,
  onPlaceBet,
}: {
  slug: string;
  node: TreeNode;
  balance: number; // whole-account balance (level XP)
  bets: Bet[]; // account-level bets
  onPlaceBet: (nodeId: string, stake: number, deadline: number) => boolean;
}) {
  const openBet = bets.find(
    (b) => b.status === "open" && b.slug === slug && b.nodeId === node.id
  );

  const [stake, setStake] = useState(String(Math.min(200, balance) || 0));
  const [dlIdx, setDlIdx] = useState(0);

  if (openBet) {
    const win = openBet.stake + Math.round(openBet.stake * BET_WIN_BONUS);
    return (
      <div className="rounded-lg border border-loot/40 bg-loot/5 p-3">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-loot/80">
          <Timer size={13} /> Активная ставка
        </div>
        <p className="mt-1 text-sm text-slate-200">
          Поставлено <b className="text-loot">{openBet.stake} XP</b> · осталось{" "}
          <b>{leftLabel(openBet.deadline)}</b>
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          Закрой шаг вовремя → вернётся {win} XP (+{Math.round(openBet.stake * BET_WIN_BONUS)} бонус). Не успеешь — потеряешь половину.
        </p>
      </div>
    );
  }

  const stakeNum = Math.round(Number(stake) || 0);
  const canBet = stakeNum > 0 && stakeNum <= balance;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
          <TrendingUp size={13} /> Ставка на дедлайн
        </span>
        <span className="font-mono text-xs text-slate-400">
          счёт аккаунта {balance} XP
        </span>
      </div>

      {balance < 1 ? (
        <p className="text-xs text-slate-500">
          Накопи немного XP, чтобы делать ставки.
        </p>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={balance}
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100"
            />
            <div className="flex flex-1 gap-1">
              {DEADLINES.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setDlIdx(i)}
                  className={`flex-1 rounded-lg border px-1 py-2 text-xs transition ${
                    dlIdx === i
                      ? "border-prog bg-prog/10 text-prog"
                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <button
            disabled={!canBet}
            onClick={() =>
              onPlaceBet(node.id, stakeNum, Date.now() + DEADLINES[dlIdx].ms)
            }
            className="mt-2 w-full rounded-lg bg-loot py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
          >
            Поставить {canBet ? stakeNum : ""} XP, что закрою за {DEADLINES[dlIdx].label}
          </button>
          <p className="mt-1 text-[11px] text-slate-500">
            Успех → +75% к ставке. Провал → теряешь половину (гуманно).
          </p>
        </>
      )}
    </div>
  );
}
