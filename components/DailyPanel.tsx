"use client";

import { Check, Dices, Gift, ListChecks, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RARITY_HEX, RARITY_META } from "@/lib/engine";
import {
  addDailyTask,
  addRandomQuestToDaily,
  availableQuests,
  claimDayLoot,
  loadDaily,
  loadIndex,
  removeDailyTask,
  setLast,
  toggleDailyTask,
  type QuestCandidate,
} from "@/lib/store";
import type { DailyTasks, Rarity } from "@/lib/types";

// notify the rest of the app (level chip) that account XP changed
const pingXP = () => window.dispatchEvent(new Event("grindos:xp"));

export function DailyPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [daily, setDaily] = useState<DailyTasks | null>(null);
  const [input, setInput] = useState("");
  const [reward, setReward] = useState<{ rarity: Rarity; bonus: number } | null>(null);
  const [picker, setPicker] = useState<QuestCandidate[] | null>(null);

  const refresh = () => setDaily(loadDaily().daily);

  useEffect(() => {
    const onOpen = () => {
      refresh();
      setReward(null);
      setPicker(null);
      setOpen(true);
    };
    window.addEventListener("grindos:daily", onOpen);
    return () => window.removeEventListener("grindos:daily", onOpen);
  }, []);

  // project titles for linked-task badges
  const titles = useMemo(
    () => new Map(loadIndex().map((e) => [e.slug, e.title])),
    [open, daily]
  );

  if (!open) return null;

  const tasks = daily?.tasks ?? [];
  const doneCount = tasks.filter((t) => t.done).length;
  const allDone = tasks.length > 0 && doneCount === tasks.length;
  const canClaim = allDone && !daily?.claimed;

  const add = () => {
    if (!input.trim()) return;
    setDaily(addDailyTask(input).daily);
    setInput("");
  };
  const toggle = (id: string) => {
    setDaily(toggleDailyTask(id).daily);
    pingXP();
  };
  const remove = (id: string) => setDaily(removeDailyTask(id).daily);
  const addRandom = () => {
    const p = addRandomQuestToDaily();
    if (p) setDaily(p.daily);
  };
  const togglePicker = () => setPicker((cur) => (cur ? null : availableQuests()));
  const addFromQuest = (q: QuestCandidate) => {
    setDaily(addDailyTask(q.name, { slug: q.slug, nodeId: q.nodeId }).daily);
    setPicker((cur) => cur && cur.filter((x) => !(x.slug === q.slug && x.nodeId === q.nodeId)));
  };
  const openProject = (slug: string) => {
    setLast(slug);
    setOpen(false);
    router.push("/");
  };
  const claim = () => {
    const res = claimDayLoot();
    if (res) {
      setDaily(res.profile.daily);
      setReward({ rarity: res.loot.rarity, bonus: res.bonus });
      pingXP();
    }
  };

  return (
    <div className="fixed inset-0 z-[55]" role="dialog" aria-modal="true" aria-label="Задачи на день">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-sm animate-rise flex-col border-l border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <ListChecks size={18} className="text-prog" />
            <span className="font-semibold text-slate-100">Задачи на день</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Закрыть"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* add */}
        <div className="flex gap-2 px-4 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Новая задача на сегодня…"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-prog"
          />
          <button
            onClick={add}
            aria-label="Добавить"
            className="rounded-lg bg-prog px-3 text-slate-950 hover:brightness-110"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* from projects */}
        <div className="flex gap-2 px-4 pb-1">
          <button
            onClick={addRandom}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:border-slate-500"
          >
            <Dices size={14} /> Случайная из проекта
          </button>
          <button
            onClick={togglePicker}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition ${
              picker
                ? "border-prog bg-prog/10 text-prog"
                : "border-slate-700 text-slate-300 hover:border-slate-500"
            }`}
          >
            <ListChecks size={14} /> Из проектов
          </button>
        </div>

        {/* project quest picker */}
        {picker && (
          <div className="mx-4 mb-2 max-h-44 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/60 p-1">
            {picker.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-slate-500">
                Нет доступных квестов в проектах.
              </p>
            ) : (
              picker.map((q) => (
                <button
                  key={`${q.slug}:${q.nodeId}`}
                  onClick={() => addFromQuest(q)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-800"
                >
                  <Plus size={13} className="shrink-0 text-prog" />
                  <span className="flex-1 truncate">{q.name}</span>
                  <span className="shrink-0 text-[10px] text-slate-500">{q.title}</span>
                </button>
              ))
            )}
          </div>
        )}

        {/* progress */}
        {tasks.length > 0 && (
          <div className="px-4 pb-2 font-mono text-xs text-slate-400">
            {doneCount}/{tasks.length} выполнено · +20 XP за задачу
          </div>
        )}

        {/* list */}
        <div className="flex-1 space-y-1.5 overflow-y-auto px-4 pb-3">
          {tasks.length === 0 && (
            <p className="mt-6 text-center text-sm text-slate-500">
              Запиши, что хочешь сделать сегодня. За каждую задачу — XP, за весь день — лут.
            </p>
          )}
          {tasks.map((t) => (
            <div
              key={t.id}
              className="group flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
            >
              <button
                onClick={() => toggle(t.id)}
                aria-label={t.done ? "Снять отметку" : "Выполнено"}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  t.done ? "border-prog bg-prog text-slate-950" : "border-slate-600"
                }`}
              >
                {t.done && <Check size={14} />}
              </button>
              <div className="min-w-0 flex-1">
                <span
                  className={`block truncate text-sm ${
                    t.done ? "text-slate-500 line-through" : "text-slate-200"
                  }`}
                >
                  {t.text}
                </span>
                {t.ref && (
                  <button
                    onClick={() => openProject(t.ref!.slug)}
                    className="mt-0.5 truncate text-[10px] text-prog/80 hover:text-prog"
                    title="Открыть проект"
                  >
                    ↗ {titles.get(t.ref.slug) ?? "проект"}
                  </button>
                )}
              </div>
              <button
                onClick={() => remove(t.id)}
                aria-label="Удалить"
                className="rounded p-1 text-slate-600 opacity-0 hover:text-boss group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* day reward */}
        <div className="border-t border-slate-800 p-4">
          {reward ? (
            <div
              className="animate-chest-pop rounded-lg p-3 text-center"
              style={{
                backgroundColor: `rgb(var(--rarity-${reward.rarity}) / 0.13)`,
                border: `1px solid ${RARITY_HEX[reward.rarity]}`,
              }}
            >
              <div className="font-mono text-sm font-bold" style={{ color: RARITY_HEX[reward.rarity] }}>
                {RARITY_META[reward.rarity].label} · +{reward.bonus} XP
              </div>
              <div className="mt-0.5 text-xs text-slate-400">Награда дня забрана 🎉</div>
            </div>
          ) : daily?.claimed ? (
            <div className="rounded-lg border border-slate-800 py-2.5 text-center text-sm text-slate-500">
              Награда дня уже забрана ✓
            </div>
          ) : (
            <button
              onClick={claim}
              disabled={!canClaim}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-loot py-2.5 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Gift size={16} />
              {allDone ? "Забрать награду дня" : "Выполни все задачи дня"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function openDaily() {
  window.dispatchEvent(new Event("grindos:daily"));
}
