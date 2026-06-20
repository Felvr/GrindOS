"use client";

import { Check, Pencil, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Dials } from "@/components/Dials";
import { Header } from "@/components/Header";
import { LootReveal } from "@/components/LootReveal";
import { MatchModal } from "@/components/MatchModal";
import { MilestoneModal } from "@/components/MilestoneModal";
import { NodeDetailModal } from "@/components/NodeDetailModal";
import { QuestEditorModal } from "@/components/QuestEditorModal";
import { RunModal } from "@/components/RunModal";
import { TopicInput } from "@/components/TopicInput";
import { Tree } from "@/components/Tree";
import { TreeMap } from "@/components/TreeMap";
import { allCleared, type RunResult } from "@/lib/engine";
import { useFocus } from "@/lib/focus";
import type { Bet, Milestone, TreeNode } from "@/lib/types";
import { useGrind } from "@/lib/useGrind";

interface LootView {
  result: RunResult;
  clearedName: string | null;
  unlockedNames: string[];
}

// Shared active-grind workspace. `view` switches the body between the tiered
// tree (home) and the full graph (map); all modal flow is identical.
export function GrindWorkspace({ view }: { view: "tree" | "map" }) {
  const g = useGrind();
  const focus = useFocus();
  const [runNode, setRunNode] = useState<TreeNode | null>(null);
  const [detailNode, setDetailNode] = useState<TreeNode | null>(null);
  const [loot, setLoot] = useState<LootView | null>(null);
  const [hitMilestones, setHitMilestones] = useState<Milestone[]>([]);
  const [matchOpen, setMatchOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editNodeId, setEditNodeId] = useState<string | null>(null);
  const [wonBets, setWonBets] = useState<Bet[]>([]);

  // entry from other pages: /?new=1 forces the "new grind" screen
  useEffect(() => {
    if (!g.ready) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      g.closeActive();
      window.history.replaceState(null, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.ready]);

  // a background focus timer finished on THIS grind → refresh + show loot
  useEffect(() => {
    const o = focus.outcome;
    if (!o || !g.grind || o.slug !== g.grind.slug) return;
    g.refresh();
    const nameOf = (id: string) =>
      g.grind?.tree.nodes.find((n) => n.id === id)?.name ?? id;
    setLoot({
      result: o.result,
      clearedName: o.result.clearedNodeId ? nameOf(o.result.clearedNodeId) : null,
      unlockedNames: o.result.unlockedNodeIds.map(nameOf),
    });
    if (o.hitMilestones.length) setHitMilestones(o.hitMilestones);
    if (o.wonBets.length) setWonBets(o.wonBets);
    focus.clearOutcome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus.outcome]);

  if (!g.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Загрузка…
      </div>
    );
  }

  const grind = g.grind;

  if (!grind) {
    return (
      <TopicInput
        onTree={g.createFromTree}
        onExit={g.cancelNew}
        canExit={g.index.length > 0}
      />
    );
  }

  const onConfirmRun = (minutes: number, phoneFree: boolean) => {
    if (!runNode) return;
    const { result, hitMilestones: hits, wonBets: won } = g.runNode(
      runNode.id,
      minutes,
      phoneFree
    );
    const nameOf = (id: string) =>
      grind.tree.nodes.find((n) => n.id === id)?.name ?? id;
    setLoot({
      result,
      clearedName: result.clearedNodeId ? nameOf(result.clearedNodeId) : null,
      unlockedNames: result.unlockedNodeIds.map(nameOf),
    });
    if (hits.length) setHitMilestones(hits);
    if (won.length) setWonBets(won);
    setRunNode(null);
  };

  const onStartTimer = (minutes: number, phoneFree: boolean) => {
    if (!runNode) return;
    focus.start({
      slug: grind.slug,
      nodeId: runNode.id,
      nodeName: runNode.name,
      minutes,
      phoneFree,
    });
    setRunNode(null);
  };

  const done = allCleared(grind);
  const editNode = editNodeId
    ? grind.tree.nodes.find((n) => n.id === editNodeId) ?? null
    : null;

  return (
    <div className="min-h-screen pb-16">
      <Header
        grind={grind}
        index={g.index}
        lifeXP={g.lifeXP}
        onSwitch={g.switchTo}
        onNew={g.closeActive}
        onRemove={g.remove}
        onReset={g.resetProgress}
        onPrestige={g.prestige}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {/* summary */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100">{grind.title}</h1>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {grind.type === "project" ? "проект" : "навык"}
            </span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">
              {grind.difficulty}
            </span>
            {grind.draft && (
              <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] uppercase text-slate-400">
                черновик
              </span>
            )}
          </div>
          {grind.summary && (
            <p className="mt-1 text-sm text-slate-400">{grind.summary}</p>
          )}
        </div>

        {/* decay notice */}
        {g.decayNotice && (
          <button
            onClick={g.clearDecayNotice}
            className="animate-rise rounded-xl border border-boss/40 bg-boss/10 p-3 text-left text-sm text-boss"
          >
            ⏳ За {g.decayNotice.days} дн. простоя заржавело: −{g.decayNotice.xpLost} XP
            {g.decayNotice.nodesRusted > 0 && `, прогресс ${g.decayNotice.nodesRusted} шагов просел`}
            . Возвращайся почаще! <span className="opacity-60">(скрыть)</span>
          </button>
        )}

        {/* expired bets */}
        {g.expiredBets.length > 0 && (
          <button
            onClick={g.clearExpiredBets}
            className="animate-rise rounded-xl border border-boss/40 bg-boss/10 p-3 text-left text-sm text-boss"
          >
            💸 Ставки не зашли: {g.expiredBets.map((b) => b.nodeName).join(", ")}.
            Вернулась половина. <span className="opacity-60">(скрыть)</span>
          </button>
        )}

        {/* won bets */}
        {wonBets.length > 0 && (
          <button
            onClick={() => setWonBets([])}
            className="animate-rise rounded-xl border border-loot/50 bg-loot/10 p-3 text-left text-sm text-loot"
          >
            🏆 Ставка зашла: {wonBets.map((b) => `${b.nodeName} +${b.payout} XP`).join(", ")}
            . <span className="opacity-60">(скрыть)</span>
          </button>
        )}

        {/* prestige / completion banner */}
        {done && (
          <div className="animate-rise flex flex-col items-start gap-3 rounded-xl border border-loot/50 bg-loot/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-loot">
              {grind.type === "project" ? "Босс повержен!" : "Все узлы закрыты!"}{" "}
              {grind.archived
                ? `Гринд в архиве, множитель ×${grind.prestigeMult}.`
                : "Можно уйти в престиж и начать новую тему с бонусом."}
            </div>
            {!grind.archived && (
              <button
                onClick={g.prestige}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-loot px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
              >
                <Sparkles size={16} /> Уйти в престиж
              </button>
            )}
          </div>
        )}

        {/* three dials */}
        <Dials grind={grind} onAddMatch={() => setMatchOpen(true)} />

        {/* tree toolbar (edit mode) */}
        {view === "tree" && (
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-slate-500">
              Дерево
            </h2>
            <button
              onClick={() => setEditing((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                editing
                  ? "border-prog bg-prog/10 text-prog"
                  : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
              }`}
            >
              {editing ? <Check size={14} /> : <Pencil size={14} />}
              {editing ? "Готово" : "Редактировать"}
            </button>
          </div>
        )}

        {/* body: tiered tree or full graph */}
        {view === "map" ? (
          <TreeMap grind={grind} onOpen={setDetailNode} />
        ) : (
          <Tree
            grind={grind}
            onGrind={setRunNode}
            onOpen={setDetailNode}
            editing={editing}
            onEdit={(node) => setEditNodeId(node.id)}
            onAdd={() => {
              const id = g.addNode();
              if (id) setEditNodeId(id);
            }}
          />
        )}
      </main>

      {detailNode && (
        <NodeDetailModal
          grind={grind}
          node={detailNode}
          onClose={() => setDetailNode(null)}
          onGrind={(node) => {
            setDetailNode(null);
            setRunNode(node);
          }}
          onSetNote={g.setNote}
          onFetchDetail={g.fetchDetail}
          onPlaceBet={g.placeBet}
          balance={g.lifeXP}
          bets={g.profile.bets}
        />
      )}
      {runNode && (
        <RunModal
          node={runNode}
          onClose={() => setRunNode(null)}
          onConfirm={onConfirmRun}
          onStartTimer={onStartTimer}
        />
      )}
      {loot && (
        <LootReveal
          result={loot.result}
          clearedName={loot.clearedName}
          unlockedNames={loot.unlockedNames}
          onClose={() => setLoot(null)}
        />
      )}
      {matchOpen && (
        <MatchModal
          grind={grind}
          onClose={() => setMatchOpen(false)}
          onConfirm={(name, score) => {
            g.addMatch(name, score);
            setMatchOpen(false);
          }}
          onFetchQuiz={g.fetchQuiz}
        />
      )}
      {!loot && hitMilestones.length > 0 && (
        <MilestoneModal
          milestones={hitMilestones}
          onClose={() => setHitMilestones([])}
        />
      )}
      {editNode && (
        <QuestEditorModal
          grind={grind}
          node={editNode}
          onClose={() => setEditNodeId(null)}
          onSave={g.updateNode}
          onDelete={g.deleteNode}
        />
      )}
    </div>
  );
}
