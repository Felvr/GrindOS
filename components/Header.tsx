"use client";

import {
  ChevronDown,
  ListChecks,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { allCleared } from "@/lib/engine";
import type { Grind, GrindIndexEntry } from "@/lib/types";
import { openDaily } from "./DailyPanel";
import { NavLinks } from "./NavLinks";
import { ThemeMenu } from "./ThemeMenu";
import { XpChip } from "./XpChip";

export function Header({
  grind,
  index,
  lifeXP,
  onSwitch,
  onNew,
  onRemove,
  onReset,
  onPrestige,
}: {
  grind: Grind;
  index: GrindIndexEntry[];
  lifeXP: number;
  onSwitch: (slug: string) => void;
  onNew: () => void;
  onRemove: (slug: string) => void;
  onReset: () => void;
  onPrestige: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const canPrestige = allCleared(grind) && !grind.archived;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="shrink-0 text-lg font-bold tracking-tight">
            Grind<span className="text-prog">OS</span>
          </span>

          {/* grind switcher */}
          <div className="relative min-w-0" ref={ref}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex w-full min-w-0 max-w-[22rem] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-500"
            >
              <span className="truncate">{grind.title}</span>
              <ChevronDown size={14} className="shrink-0 text-slate-500" />
            </button>

            {open && (
              <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl">
                <div className="max-h-64 overflow-y-auto">
                  {index
                    .filter((e) => !e.archived || e.slug === grind.slug)
                    .map((e) => (
                    <div
                      key={e.slug}
                      className={`group flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-slate-800 ${
                        e.slug === grind.slug ? "text-prog" : "text-slate-200"
                      }`}
                    >
                      <button
                        className="flex-1 truncate text-left"
                        onClick={() => {
                          onSwitch(e.slug);
                          setOpen(false);
                        }}
                      >
                        {e.title}
                        <span className="ml-1 text-[10px] uppercase text-slate-500">
                          {e.type}
                        </span>
                      </button>
                      <button
                        aria-label={`Удалить ${e.title}`}
                        onClick={() => {
                          if (confirm(`Удалить гринд «${e.title}»?`)) onRemove(e.slug);
                        }}
                        className="ml-1 rounded p-1 text-slate-600 opacity-0 hover:text-boss group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    onNew();
                    setOpen(false);
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-md border-t border-slate-800 px-2 py-2 text-sm text-prog hover:bg-slate-800"
                >
                  <Plus size={14} /> Новый гринд
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="hidden shrink-0 lg:block">
          <NavLinks />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden sm:block">
            <XpChip lifeXP={lifeXP} />
          </div>
          {grind.prestigeMult > 1 && (
            <span className="hidden rounded-full border border-loot/40 px-2 py-1 font-mono text-xs text-loot sm:inline">
              престиж ×{grind.prestigeMult}
            </span>
          )}
          {canPrestige && (
            <button
              onClick={onPrestige}
              className="inline-flex items-center gap-1 rounded-lg bg-loot px-3 py-1.5 text-xs font-semibold text-slate-950 hover:brightness-110"
            >
              <Sparkles size={14} /> Престиж
            </button>
          )}
          <button
            onClick={() => {
              if (confirm("Сбросить весь прогресс этого гринда?")) onReset();
            }}
            aria-label="Сбросить прогресс"
            className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-slate-500 hover:text-slate-200"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={onNew}
            aria-label="Новый гринд"
            className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-slate-500 hover:text-slate-200"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={openDaily}
            aria-label="Задачи на день"
            data-tour="daily"
            className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-slate-500 hover:text-slate-200"
          >
            <ListChecks size={16} />
          </button>
          <ThemeMenu />
        </div>
      </div>

      {/* nav row (until lg, where it moves inline) — also carries the level chip
          on small screens, where it's hidden from the top row */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-800/60 px-4 py-1.5 lg:hidden">
        <NavLinks />
        <div className="sm:hidden">
          <XpChip lifeXP={lifeXP} />
        </div>
      </div>
    </header>
  );
}
