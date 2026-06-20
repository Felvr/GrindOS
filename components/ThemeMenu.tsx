"use client";

import { HelpCircle, Monitor, Settings, Terminal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  getCalm,
  getTheme,
  setCalm as persistCalm,
  setTheme as persistTheme,
  type ThemeName,
} from "@/lib/theme";
import { openGuide } from "./Guide";

export function ThemeMenu() {
  const [open, setOpen] = useState(false);
  const [theme, setThemeState] = useState<ThemeName>("hud");
  const [calm, setCalmState] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setThemeState(getTheme());
    setCalmState(getCalm());
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const chooseTheme = (t: ThemeName) => {
    persistTheme(t);
    setThemeState(t);
  };
  const toggleCalm = () => {
    const next = !calm;
    persistCalm(next);
    setCalmState(next);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Настройки интерфейса"
        className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-slate-500 hover:text-slate-200"
      >
        <Settings size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl">
          <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Интерфейс
          </div>
          <button
            onClick={() => chooseTheme("hud")}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm ${
              theme === "hud" ? "bg-slate-800 text-prog" : "text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Monitor size={15} /> HUD (slate)
          </button>
          <button
            onClick={() => chooseTheme("pipboy")}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm ${
              theme === "pipboy" ? "bg-slate-800 text-prog" : "text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Terminal size={15} /> Pip-Boy (CRT)
          </button>

          {theme === "pipboy" && (
            <label className="mt-1 flex cursor-pointer items-center justify-between rounded-md px-2 py-2 text-sm text-slate-300 hover:bg-slate-800/60">
              <span>Спокойный режим</span>
              <input
                type="checkbox"
                checked={calm}
                onChange={toggleCalm}
                className="h-4 w-4 accent-prog"
              />
            </label>
          )}

          <button
            onClick={() => {
              setOpen(false);
              openGuide();
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-md border-t border-slate-800 px-2 py-2 text-sm text-slate-200 hover:bg-slate-800/60"
          >
            <HelpCircle size={15} /> Как пользоваться
          </button>
        </div>
      )}
    </div>
  );
}
