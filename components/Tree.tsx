"use client";

import type { Grind, TreeNode } from "@/lib/types";
import { NodeCard } from "./NodeCard";

export function Tree({
  grind,
  onGrind,
  onOpen,
  editing,
  onEdit,
  onAdd,
}: {
  grind: Grind;
  onGrind: (node: TreeNode) => void;
  onOpen: (node: TreeNode) => void;
  editing?: boolean;
  onEdit?: (node: TreeNode) => void;
  onAdd?: () => void;
}) {
  const tiers = [1, 2, 3, 4].filter((t) =>
    grind.tree.nodes.some((n) => n.tier === t)
  );

  return (
    <div data-tour="tree" className="flex flex-col gap-6">
      {tiers.map((tier) => {
        const nodes = grind.tree.nodes.filter((n) => n.tier === tier);
        return (
          <section key={tier}>
            <div className="mb-2 flex items-center gap-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-slate-500">
                Tier {tier}
              </h3>
              <div className="h-px flex-1 bg-slate-800" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {nodes.map((node) => (
                <NodeCard
                  key={node.id}
                  grind={grind}
                  node={node}
                  onGrind={onGrind}
                  onOpen={onOpen}
                  editing={editing}
                  onEdit={onEdit}
                />
              ))}
            </div>
          </section>
        );
      })}

      {editing && onAdd && (
        <button
          onClick={onAdd}
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-prog/50 py-4 text-sm font-medium text-prog hover:bg-prog/5"
        >
          + Добавить квест
        </button>
      )}
    </div>
  );
}
