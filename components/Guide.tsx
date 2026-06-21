"use client";

import { useEffect, useLayoutEffect, useState } from "react";

interface Step {
  target?: string; // CSS selector to spotlight (optional)
  title: string;
  text: string;
}

type SetName = "intro" | "workspace";
const SEEN_KEY = (s: SetName) => `grindos:onboarded:${s}`;

// Shown on the start screen (no grind yet).
const INTRO_STEPS: Step[] = [
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
    title: "Поехали",
    text: "Создай первый гринд — и я покажу остальное прямо на рабочем столе.",
  },
];

// Shown the first time a grind workspace is open.
const WORKSPACE_STEPS: Step[] = [
  {
    target: '[data-tour="tree"]',
    title: "Дерево — это план",
    text: "Каждый узел — шаг. Жми по карточке квеста — откроются детали, разбор от ИИ, заметки и ставка. Кнопка «Гриндить заход» запускает фокус-таймер.",
  },
  {
    target: '[data-tour="dials"]',
    title: "Прогресс виден сразу",
    text: "Три циферблата: Гараж (что умеешь), Кривая матчей (мини-тесты), Насмотренность (объём фокуса). За заходы падает лут.",
  },
  {
    target: '[data-tour="level"]',
    title: "Уровень и персонаж",
    text: "XP со всех проектов копится в уровень аккаунта. Клик — твой персонаж и статы. За простой опыт «ржавеет», так что заходи почаще.",
  },
  {
    target: '[data-tour="daily"]',
    title: "Задачи на день",
    text: "Чеклист на сегодня: пиши свои цели или закидывай квесты из проектов (случайно или вручную — они свяжутся с проектом). +20 XP за задачу, а за весь день — лут.",
  },
  {
    title: "Награды за вехи 🎁",
    text: "На странице «Награды» ставишь себе реальные призы за XP-вехи: дошёл до порога — получил приз. Плюс ставки XP на дедлайн и еженедельные лиги — соревнуйся за топ-3.",
  },
  {
    title: "Готово 🚀",
    text: "Открыть гайд снова можно в шестерёнке → «Как пользоваться». Поехали!",
  },
];

const STEPS: Record<SetName, Step[]> = {
  intro: INTRO_STEPS,
  workspace: WORKSPACE_STEPS,
};

const GAP = 12;
const seen = (s: SetName) => {
  try {
    return localStorage.getItem(SEEN_KEY(s)) === "1";
  } catch {
    return false;
  }
};
const hasGrinds = (): boolean => {
  try {
    return JSON.parse(localStorage.getItem("grindos:index") || "[]").length > 0;
  } catch {
    return false;
  }
};

// Which set fits the current screen. Returns null when grinds exist but the
// workspace DOM hasn't mounted yet — so we wait instead of flashing the intro.
const detectSet = (): SetName | null => {
  if (document.querySelector('[data-tour="tree"]')) return "workspace";
  if (!hasGrinds()) return "intro";
  return null;
};

export function Guide() {
  const [set, setSet] = useState<SetName | null>(null);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mobile, setMobile] = useState(false);

  // auto-show the set that matches the current screen, once each
  useEffect(() => {
    setMobile(window.innerWidth < 640);
    const onResize = () => setMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);

    let stop = false;
    const tryShow = () => {
      if (stop || set) return;
      const s = detectSet();
      if (s && !seen(s)) {
        setSet(s);
        setIdx(0);
      }
    };
    tryShow();
    const poll = setInterval(tryShow, 700); // catches workspace appearing later

    const onOpen = () => {
      setSet(detectSet() ?? "workspace"); // manual reopen always shows something
      setIdx(0);
    };
    window.addEventListener("grindos:guide", onOpen);
    return () => {
      stop = true;
      clearInterval(poll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("grindos:guide", onOpen);
    };
  }, [set]);

  const steps = set ? STEPS[set] : [];
  const step = steps[idx];

  // measure target (and follow it on scroll/resize)
  useLayoutEffect(() => {
    if (!set || !step?.target) {
      setRect(null);
      return;
    }
    const sel = step.target;
    const measure = () => {
      const el = document.querySelector(sel);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    measure();
    const t = setTimeout(measure, 280);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [set, idx, step?.target]);

  if (!set || !step) return null;

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY(set), "1");
    } catch {
      /* ignore */
    }
    setSet(null);
    setRect(null);
  };

  const last = idx === steps.length - 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // tooltip placement: bottom sheet on mobile (always reachable buttons),
  // anchored near target on desktop, centered if no target.
  let tipStyle: React.CSSProperties;
  if (mobile) {
    tipStyle = { position: "fixed", left: GAP, right: GAP, bottom: GAP, zIndex: 62 };
  } else if (rect && rect.width > 0) {
    const tipW = Math.min(340, vw - 2 * GAP);
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
      width: Math.min(340, vw - 2 * GAP),
      zIndex: 62,
    };
  }

  const anchored = !!(rect && rect.width > 0);

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Гайд по GrindOS">
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

      <div
        style={tipStyle}
        className="animate-rise rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-[11px] text-slate-500">
            {idx + 1} / {steps.length}
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
            {steps.map((_, i) => (
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
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-slate-500"
              >
                Назад
              </button>
            )}
            <button
              onClick={() => (last ? close() : setIdx((v) => v + 1))}
              className="rounded-lg bg-prog px-5 py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
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
