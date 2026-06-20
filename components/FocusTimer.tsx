"use client";

import { Pause, PictureInPicture2, Play, Square, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useFocus } from "@/lib/focus";

const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function FocusTimer() {
  const f = useFocus();

  if (!f.session && f.outcome) {
    return (
      <button
        onClick={f.clearOutcome}
        className="fixed bottom-4 right-4 z-50 animate-rise rounded-xl border border-prog/50 bg-slate-900 px-4 py-3 text-left text-sm text-prog shadow-2xl"
      >
        ✅ Фокус завершён: <b>{f.outcome.nodeName}</b> · +{f.outcome.result.gain} XP
        <span className="ml-1 opacity-60">(скрыть)</span>
      </button>
    );
  }

  if (!f.session) return null;

  const card = (
    <Card pip={!!f.pipWindow} />
  );

  if (f.pipWindow) {
    return createPortal(card, f.pipWindow.document.body);
  }
  return card;
}

function Card({ pip }: { pip: boolean }) {
  const f = useFocus();
  if (!f.session) return null;

  const total = f.session.minutes * 60;
  const pct = Math.min(100, Math.round(((total - f.remainingSec) / total) * 100));

  return (
    <div
      className={
        pip
          ? "flex h-screen w-screen flex-col justify-center gap-3 bg-slate-950 p-4"
          : "fixed bottom-4 right-4 z-50 w-64 animate-rise rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs text-slate-400">Фокус</div>
          <div className="truncate text-sm font-semibold text-slate-100">
            {f.session.nodeName}
          </div>
        </div>
        <button
          onClick={f.cancel}
          aria-label="Отменить фокус"
          className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
        >
          <X size={16} />
        </button>
      </div>

      <div
        className={`text-center font-mono font-bold tabular-nums ${
          f.paused ? "text-slate-500" : "text-prog"
        } ${pip ? "text-6xl" : "text-4xl"}`}
      >
        {mmss(f.remainingSec)}
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-prog" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex gap-2">
        <button
          onClick={f.paused ? f.resume : f.pause}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 py-2 text-sm font-medium text-slate-200 hover:border-slate-500"
        >
          {f.paused ? <Play size={16} /> : <Pause size={16} />}
          {f.paused ? "Дальше" : "Пауза"}
        </button>
        <button
          onClick={f.finish}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-prog py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
        >
          <Square size={14} /> Стоп
        </button>
        {!pip && f.pipSupported && (
          <button
            onClick={f.togglePip}
            aria-label="В отдельное окно (PiP)"
            title="Открепить таймер (картинка-в-картинке)"
            className="shrink-0 rounded-lg border border-slate-700 px-2.5 text-slate-300 hover:border-slate-500"
          >
            <PictureInPicture2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
