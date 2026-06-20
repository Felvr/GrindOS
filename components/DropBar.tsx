"use client";

import { RARITY_HEX, RARITY_META } from "@/lib/engine";
import type { LootEntry } from "@/lib/types";

// mini-strip of the last loot drops, colored by rarity (spec §3)
export function DropBar({ lootLog }: { lootLog: LootEntry[] }) {
  const last = lootLog.slice(-24).reverse();
  return (
    <div className="flex flex-wrap gap-1" aria-label="Последние дропы">
      {last.length === 0 && (
        <span className="text-xs text-slate-500">пока пусто</span>
      )}
      {last.map((d, i) => (
        <span
          key={i}
          title={RARITY_META[d.rarity].label}
          className="h-3 w-3 rounded-[3px]"
          style={{ backgroundColor: RARITY_HEX[d.rarity] }}
        />
      ))}
    </div>
  );
}
