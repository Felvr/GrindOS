"use client";

import {
  BookOpen,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Lock,
  Skull,
  Swords,
} from "lucide-react";
import { useEffect, useState } from "react";
import { hoursLabel, isAvailable, isCleared, missingRequires } from "@/lib/engine";
import type { Bet, Grind, NodeDetail, TreeNode } from "@/lib/types";
import { BetSection } from "./BetSection";
import { Modal } from "./Modal";

const fmtTime = (t: number) =>
  new Date(t).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function NodeDetailModal({
  grind,
  node,
  onClose,
  onGrind,
  onSetNote,
  onFetchDetail,
  onPlaceBet,
  balance,
  bets,
}: {
  grind: Grind;
  node: TreeNode;
  onClose: () => void;
  onGrind: (node: TreeNode) => void;
  onSetNote: (nodeId: string, text: string) => void;
  onFetchDetail: (nodeId: string) => Promise<NodeDetail | null>;
  onPlaceBet: (nodeId: string, stake: number, deadline: number) => boolean;
  balance: number;
  bets: Bet[];
}) {
  const cleared = isCleared(grind, node);
  const available = isAvailable(grind, node);
  const locked = !cleared && !available;

  const detail = grind.details[node.id] ?? null;
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(false);

  const [note, setNote] = useState(grind.notes[node.id] ?? "");
  // debounced autosave
  useEffect(() => {
    const id = setTimeout(() => {
      if (note !== (grind.notes[node.id] ?? "")) onSetNote(node.id, note);
    }, 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  const runs = grind.runLog.filter((r) => r.nodeId === node.id).slice(-8).reverse();

  const loadDetail = async () => {
    setLoadingDetail(true);
    setDetailError(false);
    const d = await onFetchDetail(node.id);
    if (!d) setDetailError(true);
    setLoadingDetail(false);
  };

  const StateIcon = cleared ? CheckCircle2 : node.boss ? Skull : locked ? Lock : Swords;
  const stateColor = cleared
    ? "text-loot"
    : node.boss
    ? "text-boss"
    : locked
    ? "text-slate-500"
    : "text-prog";

  return (
    <Modal title={node.name} onClose={onClose}>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {/* header line */}
        <div className="flex items-center gap-2 text-sm">
          <StateIcon size={16} className={stateColor} />
          {node.step != null && (
            <span className="font-mono text-xs text-slate-500">Шаг {node.step}</span>
          )}
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] uppercase text-slate-400">
            tier {node.tier}
          </span>
          {node.boss && (
            <span className="rounded bg-boss/20 px-2 py-0.5 text-[10px] font-bold uppercase text-boss">
              Босс
            </span>
          )}
        </div>

        {/* drill + unlock */}
        <div>
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-500">
            <span>{node.repeatable ? "Что повторять" : "Что сделать"}</span>
            <span className="text-slate-400">{hoursLabel(node.xp)} фокуса</span>
          </div>
          <p className="mt-1 text-sm text-slate-200">{node.grind}</p>
        </div>
        <div className="rounded-lg bg-loot/5 p-3">
          <div className="text-xs font-medium uppercase tracking-wider text-loot/80">
            Откроется
          </div>
          <p className="mt-1 text-sm text-loot">{node.unlock}</p>
        </div>

        {locked && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 text-xs text-slate-400">
            Сначала закрой: {missingRequires(grind, node).join(", ")}
          </div>
        )}

        {/* deadline bet */}
        {!cleared && !locked && (
          <BetSection
            slug={grind.slug}
            node={node}
            balance={balance}
            bets={bets}
            onPlaceBet={onPlaceBet}
          />
        )}

        {/* AI deep-dive */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
              <BookOpen size={13} /> Подробный разбор
            </span>
            {!detail && (
              <button
                onClick={loadDetail}
                disabled={loadingDetail}
                className="inline-flex items-center gap-1.5 rounded-md border border-prog/40 px-2.5 py-1 text-xs font-medium text-prog hover:bg-prog/10 disabled:opacity-50"
              >
                {loadingDetail ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Lightbulb size={12} />
                )}
                {loadingDetail ? "Думаю…" : "Подробнее"}
              </button>
            )}
          </div>

          {detailError && (
            <p className="text-xs text-boss">
              Не удалось получить разбор (нужен ключ ИИ). Попробуй ещё раз.
            </p>
          )}

          {detail && (
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <ol className="list-decimal space-y-1 pl-4 text-sm text-slate-200">
                {detail.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              {detail.tips.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase text-slate-500">
                    Советы
                  </div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-400">
                    {detail.tips.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {detail.resources.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase text-slate-500">
                    Где искать
                  </div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-400">
                    {detail.resources.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* personal notes */}
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
            Мои заметки
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Что понял, что застряло, ссылки…"
            rows={3}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-prog"
          />
        </div>

        {/* per-node history */}
        {runs.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
              История заходов
            </div>
            <ul className="space-y-1 font-mono text-xs text-slate-400">
              {runs.map((r, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    {fmtTime(r.t)} · {r.minutes}м {r.phoneFree ? "📵" : ""}
                  </span>
                  <span className="text-prog">+{r.gain}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* grind action — available even for cleared nodes (infinite grind) */}
      {!locked && (
        <button
          onClick={() => onGrind(node)}
          className={`mt-4 w-full rounded-lg py-3 font-semibold transition hover:brightness-110 ${
            cleared
              ? "border border-prog/40 text-prog hover:bg-prog/10"
              : node.boss
              ? "bg-boss text-slate-950"
              : "bg-prog text-slate-950"
          }`}
        >
          {cleared
            ? "Гриндить ещё"
            : node.boss
            ? "Финальный заход"
            : "Гриндить заход"}
        </button>
      )}
    </Modal>
  );
}
