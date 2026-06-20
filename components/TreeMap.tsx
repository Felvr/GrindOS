"use client";

import { isAvailable, isCleared } from "@/lib/engine";
import type { Grind, TreeNode } from "@/lib/types";

const COL_W = 210;
const ROW_H = 96;
const NODE_W = 176;
const NODE_H = 70;
const PAD_X = 24;
const PAD_Y = 40;

type Pos = { x: number; y: number; node: TreeNode };

function stateColor(grind: Grind, node: TreeNode): string {
  if (isCleared(grind, node)) return "rgb(var(--loot))";
  if (node.boss) return "rgb(var(--boss))";
  if (isAvailable(grind, node)) return "rgb(var(--prog))";
  return "rgb(var(--slate-600))"; // locked
}

export function TreeMap({
  grind,
  onOpen,
}: {
  grind: Grind;
  onOpen: (node: TreeNode) => void;
}) {
  const tiers = [1, 2, 3, 4].filter((t) =>
    grind.tree.nodes.some((n) => n.tier === t)
  );

  // deterministic layout: column per tier, row per node (sorted by step)
  const pos = new Map<string, Pos>();
  let maxRows = 0;
  tiers.forEach((tier, colIdx) => {
    const col = grind.tree.nodes
      .filter((n) => n.tier === tier)
      .sort((a, b) => (a.step ?? 99) - (b.step ?? 99));
    maxRows = Math.max(maxRows, col.length);
    col.forEach((node, rowIdx) => {
      pos.set(node.id, {
        x: PAD_X + colIdx * COL_W,
        y: PAD_Y + rowIdx * ROW_H,
        node,
      });
    });
  });

  const width = tiers.length * COL_W + PAD_X;
  const height = maxRows * ROW_H + PAD_Y;

  const clearedPct = Math.round(
    (grind.cleared.length / Math.max(1, grind.tree.nodes.length)) * 100
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="font-mono text-sm text-slate-400">
          Прогресс дерева:{" "}
          <span className="font-bold text-prog">{clearedPct}%</span>
        </div>
        <div className="h-2 max-w-xs flex-1 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full bg-prog" style={{ width: `${clearedPct}%` }} />
        </div>
        <div className="font-mono text-xs text-slate-500">
          {grind.cleared.length}/{grind.tree.nodes.length}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 p-2">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Карта дерева прогресса"
        >
          {/* tier labels */}
          {tiers.map((tier, colIdx) => (
            <text
              key={`t${tier}`}
              x={PAD_X + colIdx * COL_W + NODE_W / 2}
              y={20}
              textAnchor="middle"
              className="fill-slate-600 font-mono text-[10px] uppercase"
            >
              Tier {tier}
            </text>
          ))}

          {/* edges */}
          {grind.tree.nodes.flatMap((node) =>
            node.requires.map((reqId) => {
              const a = pos.get(reqId);
              const b = pos.get(node.id);
              if (!a || !b) return null;
              const x1 = a.x + NODE_W;
              const y1 = a.y + NODE_H / 2;
              const x2 = b.x;
              const y2 = b.y + NODE_H / 2;
              const mx = (x1 + x2) / 2;
              const done = grind.cleared.includes(reqId);
              return (
                <path
                  key={`${reqId}->${node.id}`}
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={done ? "rgb(var(--loot) / 0.55)" : "rgb(var(--slate-700))"}
                  strokeWidth={2}
                />
              );
            })
          )}

          {/* nodes */}
          {Array.from(pos.values()).map(({ x, y, node }) => {
            const color = stateColor(grind, node);
            const cur = grind.progress[node.id] ?? 0;
            const pct = Math.min(100, Math.round((cur / node.xp) * 100));
            return (
              <g
                key={node.id}
                transform={`translate(${x} ${y})`}
                onClick={() => onOpen(node)}
                style={{ cursor: "pointer" }}
              >
                <title>{`${node.name} — ${node.unlock}`}</title>
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  fill="rgb(var(--slate-900))"
                  stroke={color}
                  strokeWidth={2}
                />
                {node.step != null && (
                  <text x={10} y={18} className="fill-slate-500 font-mono text-[9px]">
                    Шаг {node.step}
                  </text>
                )}
                <text
                  x={10}
                  y={36}
                  className="fill-slate-100 text-[12px] font-semibold"
                >
                  {node.name.length > 22 ? node.name.slice(0, 21) + "…" : node.name}
                </text>
                {/* xp bar */}
                <rect x={10} y={50} width={NODE_W - 20} height={6} rx={3} fill="rgb(var(--slate-800))" />
                <rect x={10} y={50} width={((NODE_W - 20) * pct) / 100} height={6} rx={3} fill={color} />
                {node.boss && (
                  <text x={NODE_W - 10} y={18} textAnchor="end" className="fill-boss text-[9px] font-bold">
                    БОСС
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        <Legend color="rgb(var(--prog))" label="доступен" />
        <Legend color="rgb(var(--loot))" label="закрыт" />
        <Legend color="rgb(var(--slate-600))" label="заблокирован" />
        <Legend color="rgb(var(--boss))" label="босс" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-3 w-3 rounded" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
