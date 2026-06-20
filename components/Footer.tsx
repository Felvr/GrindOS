"use client";

import { Mail, Send } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-8 border-t border-slate-800/70 px-4 py-8 text-sm text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-bold tracking-tight text-slate-200">
            Grind<span className="text-prog">OS</span>
          </div>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">
            Геймифицированный гриндер для учёбы и дел: тема → пошаговое дерево-план,
            фокус-заходы, лут и видимый прогресс. Данные хранятся локально в браузере.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Контакты
          </div>
          <a
            href="https://t.me/pmpk1n"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-prog"
          >
            <Send size={14} /> @pmpk1n
          </a>
          <a
            href="mailto:daniil.revyakin06@gmail.com"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-prog"
          >
            <Mail size={14} /> daniil.revyakin06@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}
