"use client";

import { useEffect, useLayoutEffect, useState } from "react";

const KEY = "grindos:onboarded";

interface Step {
  target?: string; // CSS selector of the component to spotlight (optional)
  title: string;
  text: string;
}

// The tour adapts to what's on screen: steps whose target exists get a spotlight
// next to the real component; the rest show as a centered card.
const STEPS: Step[] = [
  {
    title: "Добро пожаловать в GrindOS 👋",
    text: "Вбей тему или задачу — ИИ разложит её на пошаговое дерево-план. Гриндишь короткими заходами и сразу видишь, как растёт скилл.",
  },
  {
    target: '[data-tour="topic"]',
    title: "С чего начать",
    text: "Сюда вбиваешь тему («испанский») или задачу («запустить бота»). Или вставь готовый план — ИИ разнесёт его по шагам.",
  },
  {
    target: '[data-tour="difficulty"]',
    title: "Сложность",
    text: "Задаёт, на сколько шагов разбить путь: от 3–4 (лёгкая) до 7–9 (сложная). «Авто» — ИИ решит сам.",
  },
  {
    target: '[data-tour="tree"]',
    title: "Дерево — это план",
    text: "Каждый узел — шаг. Жми по карточке квеста — откроются детали, разбор от ИИ, заметки и ставка. Кнопка «Гриндить заход» запускает фокус.",
  },
  {
    target: '[data-tour="dials"]',
    title: "Прогресс виден сразу",
    text: "Три циферблата: Гараж (что умеешь), Кривая матчей (мини-тесты), Насмотренность (объём фокуса). За заходы падает лут.",
  },
  {
    target: '[data-tour="level"]',
    title: "Уровень и персонаж",
    text: "XP со всех проектов копится в уровень аккаунта. Клик — твой персонаж и статы. Ставь награды на вехах и XP на дедлайн; за простой опыт «ржавеет».",
  },
  {
    title: "Готово 🚀",
    text: "Создай первый гринд и закрой первый шаг сегодня. Открыть гайд снова можно в шестерёнке → «Как пользоваться».",
  },
];

const GAP = 12;

export function Guide() {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // auto-show on first visit; re-open on demand
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(KEY) === "1";
    } catch {
      /* ignore */
    }
    if (!seen) setOpen(true);
    const onOpen = () => {
      setIdx(0);
      setOpen(true);
    };
    window.addEventListener("grindos:guide", onOpen);
    return () => window.removeEventListener("grindos:guide", onOpen);
  }, []);

  // measure the current target (and follow it on scroll/resize)
  useLayoutEffect(() => {
    if (!open) return;
    const sel = STEPS[idx].target;
    if (!sel) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector(sel);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    measure();
    const t = setTimeout(measure, 280); // after smooth scroll settles
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, idx]);

  const close = () => {
    setOpen(false);
    setRect(null);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!open) return null;

  const step = STEPS[idx];
  const last = idx === STEPS.length - 1;

  // tooltip placement
  const vw = typeof window !== "undefined" ? window.innerWidth : 360;
  const vh = typeof window !== "undefined" ? window.innerHeight : 640;
  const tipW = Math.min(340, vw - 2 * GAP);
  let tipStyle: React.CSSProperties;
  let anchored = false;
  if (rect && rect.width > 0) {
    anchored = true;
    const placeBelow = vh - rect.bottom > 230 || rect.top < 230;
    const top = placeBelow
      ? Math.min(rect.bottom + GAP, vh - 220)
      : Math.max(GAP, rect.top - 210 - GAP);
    let left = rect.left + rect.width / 2 - tipW / 2;
    left = Math.max(GAP, Math.min(left, vw - tipW - GAP));
    tipStyle = { position: "fixed", top, left, width: tipW, zIndex: 62 };
  } else {
    tipStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%,-50%)",
      width: tipW,
      zIndex: 62,
    };
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Гайд по GrindOS">
      {/* dimmer: spotlight hole when anchored, full dim otherwise */}
      {anchored ? (
        <div
          className="pointer-events-none fixed rounded-xl"
          style={{
            top: rect!.top - 6,
            left: rect!.left - 6,
            width: rect!.width + 12,
            height: rect!.height + 12,
            border: "2px solid rgb(var(--prog))",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
            zIndex: 61,
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/72" style={{ zIndex: 61 }} />
      )}

      {/* tooltip card */}
      <div
        style={tipStyle}
        className="animate-rise rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-[11px] text-slate-500">
            {idx + 1} / {STEPS.length}
          </span>
          <button
            onClick={close}
            aria-label="Пропустить гайд"
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            пропустить
          </button>
        </div>
        <h2 className="mb-1.5 text-base font-bold text-slate-100">{step.title}</h2>
        <p className="text-sm leading-relaxed text-slate-300">{step.text}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Шаг ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-4 bg-prog" : "w-1.5 bg-slate-700"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {idx > 0 && (
              <button
                onClick={() => setIdx((v) => v - 1)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500"
              >
                Назад
              </button>
            )}
            <button
              onClick={() => (last ? close() : setIdx((v) => v + 1))}
              className="rounded-lg bg-prog px-4 py-1.5 text-sm font-semibold text-slate-950 hover:brightness-110"
            >
              {last ? "Поехали 🚀" : "Далее"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-open the guide from anywhere (e.g. settings menu).
export function openGuide() {
  window.dispatchEvent(new Event("grindos:guide"));
}
