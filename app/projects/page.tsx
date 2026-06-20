"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ProjectCard } from "@/components/ProjectCard";
import {
  deleteGrind,
  lifetimeXP,
  loadAllGrinds,
  setArchived,
  setLast,
} from "@/lib/store";
import type { Grind } from "@/lib/types";

export default function ProjectsPage() {
  const router = useRouter();
  const [grinds, setGrinds] = useState<Grind[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [lifeXP, setLifeXP] = useState(0);

  const refresh = () => {
    setGrinds(loadAllGrinds().sort((a, b) => b.createdAt - a.createdAt));
    setLifeXP(lifetimeXP());
    try {
      setActiveSlug(localStorage.getItem("grindos:last"));
    } catch {
      /* ignore */
    }
  };

  useEffect(refresh, []);

  const open = (slug: string) => {
    setLast(slug);
    router.push("/");
  };

  const remove = (slug: string, title: string) => {
    if (confirm(`Удалить гринд «${title}»?`)) {
      deleteGrind(slug);
      refresh();
    }
  };

  const archive = (slug: string, archived: boolean) => {
    setArchived(slug, archived);
    refresh();
  };

  const active = grinds.filter((g) => !g.archived);
  const archived = grinds.filter((g) => g.archived);

  const card = (g: Grind) => (
    <ProjectCard
      key={g.slug}
      grind={g}
      active={g.slug === activeSlug}
      onOpen={() => open(g.slug)}
      onDelete={() => remove(g.slug, g.title)}
      onArchive={() => archive(g.slug, true)}
      onRestore={() => archive(g.slug, false)}
    />
  );

  return (
    <div className="min-h-screen pb-16">
      <PageHeader lifeXP={lifeXP} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Проекты</h1>
            <p className="text-sm text-slate-400">
              Все темы и дела. Выбери, над чем работать.
            </p>
          </div>
          <button
            onClick={() => router.push("/?new=1")}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-prog px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
          >
            <Plus size={16} /> Новый
          </button>
        </div>

        {grinds.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">
            Пока нет ни одного гринда.{" "}
            <button
              onClick={() => router.push("/?new=1")}
              className="text-prog underline"
            >
              Создать первый
            </button>
            .
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {active.map(card)}
            </div>
            {active.length === 0 && (
              <p className="text-sm text-slate-500">
                Все проекты в архиве. Создай новый или верни из архива ниже.
              </p>
            )}

            {archived.length > 0 && (
              <>
                <h2 className="mb-3 mt-8 font-mono text-xs font-bold uppercase tracking-widest text-slate-500">
                  Архив ({archived.length})
                </h2>
                <div className="grid grid-cols-1 gap-3 opacity-70 sm:grid-cols-2 lg:grid-cols-3">
                  {archived.map(card)}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
