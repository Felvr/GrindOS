"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { allCleared, applyDecay, xpToLevel, type RunResult } from "./engine";
import {
  commitRun,
  createGrind,
  deleteGrind,
  lifetimeXP,
  loadGrind,
  loadIndex,
  loadLast,
  loadProfile,
  placeBetStore,
  resolveBetsStore,
  saveGrind,
  saveProfile,
  setArchived,
  setLast,
} from "./store";
import { sanitizeNodes } from "./normalize";
import type {
  Bet,
  GeneratedTree,
  Grind,
  GrindIndexEntry,
  MatchRecord,
  Milestone,
  NodeDetail,
  Profile,
  Quiz,
  TreeNode,
} from "./types";

export interface RunOutcome {
  result: RunResult;
  hitMilestones: Milestone[];
  wonBets: Bet[];
}

export interface DecayNotice {
  xpLost: number;
  nodesRusted: number;
  days: number;
}

// On load/switch, rust idle progress. (Account-level bets are settled separately
// via resolveBetsStore since they span all grinds.)
function prepareGrind(g0: Grind): {
  grind: Grind;
  decay: DecayNotice | null;
} {
  const d = applyDecay(g0);
  if (d.grind !== g0) saveGrind(d.grind);
  return {
    grind: d.grind,
    decay:
      d.xpLost > 0 || d.nodesRusted > 0
        ? { xpLost: d.xpLost, nodesRusted: d.nodesRusted, days: d.daysIdle }
        : null,
  };
}

export interface UseGrind {
  ready: boolean;
  grind: Grind | null;
  index: GrindIndexEntry[];
  lifeXP: number;
  level: number;
  profile: Profile;
  createFromTree: (gen: GeneratedTree) => void;
  switchTo: (slug: string) => void;
  remove: (slug: string) => void;
  archive: (slug: string) => void;
  unarchive: (slug: string) => void;
  closeActive: () => void; // back to empty/new screen without deleting
  cancelNew: () => void; // leave the new-grind screen, return to existing grind
  refresh: () => void; // re-read the active grind from store (after background timer)
  runNode: (
    nodeId: string,
    minutes: number,
    phoneFree: boolean
  ) => RunOutcome;
  addMatch: (name: string, score: number) => void;
  setNote: (nodeId: string, text: string) => void;
  fetchDetail: (nodeId: string) => Promise<NodeDetail | null>;
  fetchQuiz: (count?: number) => Promise<Quiz | null>;
  addMilestone: (xpTarget: number, reward: string) => void;
  editMilestone: (id: string, patch: Partial<Milestone>) => void;
  removeMilestone: (id: string) => void;
  updateNode: (id: string, patch: Partial<TreeNode>) => void;
  addNode: () => string | null;
  deleteNode: (id: string) => void;
  placeBet: (nodeId: string, stake: number, deadline: number) => boolean;
  decayNotice: DecayNotice | null;
  clearDecayNotice: () => void;
  expiredBets: Bet[];
  clearExpiredBets: () => void;
  resetProgress: () => void;
  prestige: () => void;
}

export function useGrind(): UseGrind {
  const [ready, setReady] = useState(false);
  const [grind, setGrind] = useState<Grind | null>(null);
  const [index, setIndex] = useState<GrindIndexEntry[]>([]);
  const [lifeXP, setLifeXP] = useState(0);
  const [profile, setProfile] = useState<Profile>({
    milestones: [],
    bets: [],
    xpAdjust: 0,
  });
  const [decayNotice, setDecayNotice] = useState<DecayNotice | null>(null);
  const [expiredBets, setExpiredBets] = useState<Bet[]>([]);
  // when true, show the "new grind" screen even though grinds exist
  const forceEmpty = useRef(false);

  // initial load (rust idle progress, settle account-level bets)
  useEffect(() => {
    setIndex(loadIndex());
    const last = loadLast();
    if (last) {
      const prep = prepareGrind(last);
      setGrind(prep.grind);
      if (prep.decay) setDecayNotice(prep.decay);
    }
    const settled = resolveBetsStore(); // settles across all grinds
    if (settled.lost.length) setExpiredBets(settled.lost);
    setProfile(loadProfile());
    setLifeXP(lifetimeXP());
    setReady(true);
  }, []);

  // persist + keep index fresh on every grind change
  const commit = useCallback((next: Grind) => {
    saveGrind(next);
    setGrind(next);
    setIndex(loadIndex());
    setLifeXP(lifetimeXP());
  }, []);

  const persistProfile = useCallback((next: Profile) => {
    saveProfile(next);
    setProfile(next);
  }, []);

  const createFromTree = useCallback(
    (gen: GeneratedTree) => {
      // carry over a prestige bonus from the most recent archived grind
      const last = loadLast();
      const g = createGrind(gen);
      if (last?.archived && last.prestigeMult > 1) {
        g.prestigeMult = last.prestigeMult;
      }
      forceEmpty.current = false;
      commit(g);
    },
    [commit]
  );

  const switchTo = useCallback((slug: string) => {
    const g = loadGrind(slug);
    if (g) {
      forceEmpty.current = false;
      setLast(slug);
      const prep = prepareGrind(g);
      setGrind(prep.grind);
      setDecayNotice(prep.decay);
      setLifeXP(lifetimeXP());
    }
  }, []);

  const remove = useCallback(
    (slug: string) => {
      deleteGrind(slug);
      const nextIndex = loadIndex();
      setIndex(nextIndex);
      if (grind?.slug === slug) {
        setGrind(loadLast());
      }
    },
    [grind]
  );

  const closeActive = useCallback(() => {
    forceEmpty.current = true;
    setGrind(null);
  }, []);

  const archive = useCallback(
    (slug: string) => {
      setArchived(slug, true);
      setIndex(loadIndex());
      if (grind?.slug === slug) setGrind(loadLast()); // hand off to a live grind
    },
    [grind]
  );

  const unarchive = useCallback((slug: string) => {
    setArchived(slug, false);
    setIndex(loadIndex());
  }, []);

  // leave the "new grind" screen and return to the existing grind
  const cancelNew = useCallback(() => {
    const last = loadLast();
    if (!last) return; // nothing to go back to
    forceEmpty.current = false;
    const prep = prepareGrind(last);
    setGrind(prep.grind);
    setDecayNotice(prep.decay);
    setLifeXP(lifetimeXP());
  }, []);

  const refresh = useCallback(() => {
    setGrind((g) => (g ? loadGrind(g.slug) ?? g : g));
    setLifeXP(lifetimeXP());
    setIndex(loadIndex());
  }, []);

  const runNode = useCallback(
    (nodeId: string, minutes: number, phoneFree: boolean): RunOutcome => {
      if (!grind) throw new Error("no active grind");
      // unified path: apply via store (settles milestones + account-level bets)
      const res = commitRun(grind.slug, nodeId, minutes, phoneFree);
      if (!res) throw new Error("commit failed");
      setGrind(loadGrind(grind.slug));
      setIndex(loadIndex());
      setProfile(loadProfile());
      setLifeXP(lifetimeXP());
      if (res.lostBets.length) setExpiredBets((e) => [...e, ...res.lostBets]);
      return {
        result: res.result,
        hitMilestones: res.hitMilestones,
        wonBets: res.wonBets,
      };
    },
    [grind]
  );

  const addMatch = useCallback(
    (name: string, score: number) => {
      if (!grind) return;
      const rec: MatchRecord = {
        name,
        score: Math.max(0, Math.min(100, Math.round(score))),
        t: Date.now(),
      };
      commit({ ...grind, matches: [...grind.matches, rec] });
    },
    [grind, commit]
  );

  const setNote = useCallback(
    (nodeId: string, text: string) => {
      if (!grind) return;
      commit({ ...grind, notes: { ...grind.notes, [nodeId]: text } });
    },
    [grind, commit]
  );

  const fetchDetail = useCallback(
    async (nodeId: string): Promise<NodeDetail | null> => {
      if (!grind) return null;
      const cached = grind.details[nodeId];
      if (cached) return cached;
      const node = grind.tree.nodes.find((n) => n.id === nodeId);
      if (!node) return null;
      try {
        const res = await fetch("/api/explain-node", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: grind.title,
            nodeName: node.name,
            grind: node.grind,
            unlock: node.unlock,
          }),
        });
        if (!res.ok) return null;
        const detail: NodeDetail = await res.json();
        commit({
          ...grind,
          details: { ...grind.details, [nodeId]: detail },
        });
        return detail;
      } catch {
        return null;
      }
    },
    [grind, commit]
  );

  const fetchQuiz = useCallback(async (count = 5): Promise<Quiz | null> => {
    if (!grind) return null;
    const focus = grind.cleared
      .map((id) => grind.tree.nodes.find((n) => n.id === id)?.name)
      .filter(Boolean)
      .join(", ");
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: grind.title, focus, count }),
      });
      if (!res.ok) return null;
      return (await res.json()) as Quiz;
    } catch {
      return null;
    }
  }, [grind]);

  // ---- milestone CRUD (global profile) ----
  const addMilestone = useCallback(
    (xpTarget: number, reward: string) => {
      const m: Milestone = {
        id: `m${Date.now()}`,
        xpTarget: Math.max(1, Math.round(xpTarget)),
        reward: reward.trim() || "Награда",
      };
      persistProfile({ ...profile, milestones: [...profile.milestones, m] });
    },
    [profile, persistProfile]
  );

  const editMilestone = useCallback(
    (id: string, patch: Partial<Milestone>) => {
      persistProfile({
        ...profile,
        milestones: profile.milestones.map((m) =>
          m.id === id ? { ...m, ...patch } : m
        ),
      });
    },
    [profile, persistProfile]
  );

  const removeMilestone = useCallback(
    (id: string) => {
      persistProfile({
        ...profile,
        milestones: profile.milestones.filter((m) => m.id !== id),
      });
    },
    [profile, persistProfile]
  );

  // ---- account-level bet (stake from the whole account balance) ----
  const placeBet = useCallback(
    (nodeId: string, stake: number, deadline: number): boolean => {
      if (!grind) return false;
      const node = grind.tree.nodes.find((n) => n.id === nodeId);
      if (!node) return false;
      const ok = placeBetStore(grind.slug, nodeId, node.name, stake, deadline);
      if (ok) {
        setProfile(loadProfile());
        setLifeXP(lifetimeXP());
      }
      return ok;
    },
    [grind]
  );

  // ---- quest editor (mutate tree, re-validate) ----
  const commitNodes = useCallback(
    (next: Grind, nodes: TreeNode[]) => {
      const sane = sanitizeNodes(nodes, next.type);
      commit({ ...next, tree: { ...next.tree, nodes: sane } });
    },
    [commit]
  );

  const updateNode = useCallback(
    (id: string, patch: Partial<TreeNode>) => {
      if (!grind) return;
      const nodes = grind.tree.nodes.map((n) =>
        n.id === id ? { ...n, ...patch } : n
      );
      commitNodes(grind, nodes);
    },
    [grind, commitNodes]
  );

  const addNode = useCallback((): string | null => {
    if (!grind) return null;
    const id = `q${Date.now()}`;
    const node: TreeNode = {
      id,
      name: "Новый шаг",
      tier: 1,
      step: 99,
      requires: [],
      grind: "Что конкретно сделать на этом шаге.",
      xp: 100,
      unlock: "Что появится/смогу после шага.",
    };
    commitNodes(grind, [...grind.tree.nodes, node]);
    return id;
  }, [grind, commitNodes]);

  const deleteNode = useCallback(
    (id: string) => {
      if (!grind) return;
      const node = grind.tree.nodes.find((n) => n.id === id);
      const nodes = grind.tree.nodes.filter((n) => n.id !== id);
      const progress = { ...grind.progress };
      delete progress[id];
      const cleared = grind.cleared.filter((c) => c !== id);
      const garage = node
        ? grind.garage.filter((g) => g.name !== node.name)
        : grind.garage;
      const sane = sanitizeNodes(nodes, grind.type);
      commit({
        ...grind,
        tree: { ...grind.tree, nodes: sane },
        progress,
        cleared,
        garage,
      });
    },
    [grind, commit]
  );

  const clearDecayNotice = useCallback(() => setDecayNotice(null), []);
  const clearExpiredBets = useCallback(() => setExpiredBets([]), []);

  const resetProgress = useCallback(() => {
    if (!grind) return;
    const now = Date.now();
    commit({
      ...grind,
      progress: {},
      cleared: [],
      garage: [],
      matches: [],
      reps: 0,
      minutes: 0,
      earnedXP: 0,
      xpBalance: 0,
      lastActiveAt: now,
      decayedAt: now,
      bets: [],
      lootLog: [],
      runLog: [],
      archived: false,
    });
  }, [grind, commit]);

  const prestige = useCallback(() => {
    if (!grind || !allCleared(grind)) return;
    // permanent meta multiplier: +15% per prestige, capped sensibly
    const nextMult = Math.min(3, +(grind.prestigeMult * 1.15).toFixed(2));
    commit({ ...grind, archived: true, prestigeMult: nextMult });
  }, [grind, commit]);

  // expose null grind when the user explicitly went back to "new"
  const visibleGrind = forceEmpty.current ? null : grind;

  return {
    ready,
    grind: visibleGrind,
    index,
    lifeXP,
    level: xpToLevel(lifeXP),
    profile,
    createFromTree,
    switchTo,
    remove,
    archive,
    unarchive,
    closeActive,
    cancelNew,
    refresh,
    runNode,
    addMatch,
    setNote,
    fetchDetail,
    fetchQuiz,
    addMilestone,
    editMilestone,
    removeMilestone,
    updateNode,
    addNode,
    deleteNode,
    placeBet,
    decayNotice,
    clearDecayNotice,
    expiredBets,
    clearExpiredBets,
    resetProgress,
    prestige,
  };
}
