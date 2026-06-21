"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { track } from "./analytics";
import { commitRun, type CommitRunResult } from "./store";
import type { Bet, Milestone, RunEntry } from "./types";

export interface FocusSession {
  slug: string;
  nodeId: string;
  nodeName: string;
  minutes: number;
  phoneFree: boolean;
  startedAt: number;
  pausedAccum: number; // total paused ms
  pausedAt: number | null; // when current pause began
}

export interface FocusOutcome {
  slug: string;
  nodeName: string;
  minutes: number;
  result: CommitRunResult["result"];
  hitMilestones: Milestone[];
  wonBets: Bet[];
}

interface FocusCtx {
  session: FocusSession | null;
  remainingSec: number;
  paused: boolean;
  outcome: FocusOutcome | null;
  pipSupported: boolean;
  pipWindow: Window | null;
  start: (s: Omit<FocusSession, "startedAt" | "pausedAccum" | "pausedAt">) => void;
  pause: () => void;
  resume: () => void;
  finish: () => void; // early stop → partial credit
  cancel: () => void; // abandon, no XP
  clearOutcome: () => void;
  togglePip: () => Promise<void>;
}

const Ctx = createContext<FocusCtx | null>(null);

export function useFocus(): FocusCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFocus must be used within FocusProvider");
  return c;
}

const activeElapsedMs = (s: FocusSession, now: number): number =>
  now - s.startedAt - s.pausedAccum - (s.pausedAt ? now - s.pausedAt : 0);

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<FocusSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [outcome, setOutcome] = useState<FocusOutcome | null>(null);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const finishedRef = useRef(false);

  const pipSupported =
    typeof window !== "undefined" && "documentPictureInPicture" in window;

  // tick while a session is active and not paused
  useEffect(() => {
    if (!session || session.pausedAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [session]);

  const totalMs = session ? session.minutes * 60_000 : 0;
  const elapsedMs = session ? activeElapsedMs(session, now) : 0;
  const remainingSec = session
    ? Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000))
    : 0;
  const paused = !!session?.pausedAt;

  const complete = useCallback(
    (s: FocusSession, minutes: number) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      track("focus_complete");
      const res = commitRun(s.slug, s.nodeId, minutes, s.phoneFree);
      setSession(null);
      if (res) {
        setOutcome({
          slug: s.slug,
          nodeName: s.nodeName,
          minutes,
          result: res.result,
          hitMilestones: res.hitMilestones,
          wonBets: res.wonBets,
        });
      }
    },
    []
  );

  // natural completion
  useEffect(() => {
    if (session && !session.pausedAt && remainingSec <= 0) {
      complete(session, session.minutes);
    }
  }, [session, remainingSec, complete]);

  const start: FocusCtx["start"] = useCallback((s) => {
    finishedRef.current = false;
    setOutcome(null);
    setSession({ ...s, startedAt: Date.now(), pausedAccum: 0, pausedAt: null });
    setNow(Date.now());
  }, []);

  const pause = useCallback(() => {
    setSession((s) => (s && !s.pausedAt ? { ...s, pausedAt: Date.now() } : s));
  }, []);

  const resume = useCallback(() => {
    setSession((s) =>
      s && s.pausedAt
        ? { ...s, pausedAccum: s.pausedAccum + (Date.now() - s.pausedAt), pausedAt: null }
        : s
    );
    setNow(Date.now());
  }, []);

  const finish = useCallback(() => {
    if (!session) return;
    const mins = Math.max(1, Math.round(activeElapsedMs(session, Date.now()) / 60_000));
    complete(session, mins);
  }, [session, complete]);

  const cancel = useCallback(() => {
    finishedRef.current = true;
    setSession(null);
  }, []);

  const clearOutcome = useCallback(() => setOutcome(null), []);

  // ---- Document Picture-in-Picture ----
  const togglePip = useCallback(async () => {
    const dpip = (window as any).documentPictureInPicture;
    if (!dpip) return;
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
      return;
    }
    let w: Window;
    try {
      w = await dpip.requestWindow({ width: 320, height: 220 });
    } catch {
      return; // user dismissed or environment blocked it — keep the floating timer
    }
    // copy theme + styles so Tailwind/CSS variables apply inside the PiP window
    const root = w.document.documentElement;
    root.dataset.theme = document.documentElement.dataset.theme ?? "hud";
    root.dataset.crtCalm = document.documentElement.dataset.crtCalm ?? "false";
    document
      .querySelectorAll('link[rel="stylesheet"], style')
      .forEach((node) => w.document.head.appendChild(node.cloneNode(true)));
    w.document.body.style.margin = "0";
    w.document.body.style.background = getComputedStyle(document.body).backgroundColor;
    w.addEventListener("pagehide", () => setPipWindow(null));
    setPipWindow(w);
  }, [pipWindow]);

  // close PiP when the session ends
  useEffect(() => {
    if (!session && pipWindow) {
      pipWindow.close();
      setPipWindow(null);
    }
  }, [session, pipWindow]);

  // auto-open PiP when leaving the tab while a session runs (best-effort: the
  // browser may reject without a user gesture — then the floating timer stays)
  useEffect(() => {
    if (!pipSupported) return;
    const onVis = () => {
      if (document.hidden && session && !pipWindow) {
        togglePip().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [pipSupported, session, pipWindow, togglePip]);

  const value = useMemo<FocusCtx>(
    () => ({
      session,
      remainingSec,
      paused,
      outcome,
      pipSupported,
      pipWindow,
      start,
      pause,
      resume,
      finish,
      cancel,
      clearOutcome,
      togglePip,
    }),
    [session, remainingSec, paused, outcome, pipSupported, pipWindow, start, pause, resume, finish, cancel, clearOutcome, togglePip]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// helper re-export to keep RunEntry type usage local if needed elsewhere
export type { RunEntry };
