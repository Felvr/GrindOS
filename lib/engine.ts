import type {
  Bet,
  Grind,
  LootEntry,
  Milestone,
  Profile,
  Rarity,
  RunEntry,
  TreeNode,
} from "./types";

export const RARITY_META: Record<
  Rarity,
  { label: string; mult: number }
> = {
  legendary: { label: "ЛЕГЕНДА", mult: 2.2 },
  epic:      { label: "Эпик",    mult: 1.1 },
  rare:      { label: "Редкий",  mult: 0.6 },
  uncommon:  { label: "Необычный", mult: 0.3 },
  junk:      { label: "Хлам",    mult: 0 },
};

// Theme-aware rarity colors (resolve via CSS variables, work in SVG + inline styles).
export const RARITY_HEX: Record<Rarity, string> = {
  legendary: "rgb(var(--rarity-legendary))",
  epic:      "rgb(var(--rarity-epic))",
  rare:      "rgb(var(--rarity-rare))",
  uncommon:  "rgb(var(--rarity-uncommon))",
  junk:      "rgb(var(--rarity-junk))",
};

export function computeBase(minutes: number, phoneFree: boolean): number {
  return Math.round(minutes * (phoneFree ? 2 : 1) * 1.2);
}

// ---- Effort calibration: 1 hour of focus ≈ 120 XP (one 50-min phone-free raid) ----
// Lets node XP targets reflect real time-on-task.
export const XP_PER_HOUR = 120;
export const XP_MIN = 30;
export const XP_MAX = 3000;

export function xpForHours(hours: number): number {
  const xp = Math.round((Number(hours) || 0) * XP_PER_HOUR);
  return Math.max(XP_MIN, Math.min(XP_MAX, xp));
}

export function hoursForXp(xp: number): number {
  return xp / XP_PER_HOUR;
}

// "≈ 2.5 ч" style label from an XP target.
export function hoursLabel(xp: number): string {
  const h = hoursForXp(xp);
  if (h < 1) return `≈ ${Math.round(h * 60)} мин`;
  return `≈ ${h % 1 === 0 ? h : h.toFixed(1)} ч`;
}

export interface LootResult {
  rarity: Rarity;
  mult: number;
  bonus: number;
}

export function rollLoot(base: number, phoneFree: boolean): LootResult {
  let r = Math.random();
  if (phoneFree) r = r * 0.6 + 0.4;

  let rarity: Rarity;
  let mult: number;
  if (r > 0.997)      { rarity = "legendary"; mult = 2.2; }
  else if (r > 0.95)  { rarity = "epic";      mult = 1.1; }
  else if (r > 0.82)  { rarity = "rare";       mult = 0.6; }
  else if (r > 0.55)  { rarity = "uncommon";   mult = 0.3; }
  else                { rarity = "junk";        mult = 0; }

  return { rarity, mult, bonus: Math.round(base * mult) };
}

export function isCleared(grind: Grind, node: TreeNode): boolean {
  return grind.cleared.includes(node.id);
}

export function isAvailable(grind: Grind, node: TreeNode): boolean {
  if (isCleared(grind, node)) return false;
  return node.requires.every((req) => grind.cleared.includes(req));
}

export function missingRequires(grind: Grind, node: TreeNode): string[] {
  const names = new Map(grind.tree.nodes.map((n) => [n.id, n.name]));
  return node.requires
    .filter((req) => !grind.cleared.includes(req))
    .map((req) => names.get(req) ?? req);
}

// ---- Deadline bets (win +75%, lose half the stake) ----
export const BET_WIN_BONUS = 0.75;
export const BET_LOSS_REFUND = 0.5; // refunded on loss → net −half the stake

export interface RunResult {
  base: number;
  loot: LootResult;
  gain: number;
  clearedNodeId: string | null;
  unlockedNodeIds: string[];
}

export function applyRun(
  grind: Grind,
  nodeId: string,
  minutes: number,
  phoneFree: boolean
): { grind: Grind; result: RunResult } {
  const node = grind.tree.nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error(`node not found: ${nodeId}`);

  const rawBase = computeBase(minutes, phoneFree);
  const base = Math.round(rawBase * (grind.prestigeMult || 1));
  const loot = rollLoot(base, phoneFree);
  const gain = base + loot.bonus;

  // Infinite grind: progress is NOT capped — a node can be ground past its
  // target so you can always return to it. It clears once (first crossing).
  const prev = grind.progress[nodeId] ?? 0;
  const next = prev + gain;
  const progress = { ...grind.progress, [nodeId]: next };

  const lootLog: LootEntry[] = [
    ...grind.lootLog,
    { rarity: loot.rarity, t: Date.now() },
  ].slice(-40);

  const runEntry: RunEntry = {
    nodeId,
    minutes,
    phoneFree,
    gain,
    rarity: loot.rarity,
    t: Date.now(),
  };
  const runLog = [...(grind.runLog ?? []), runEntry].slice(-200);

  let cleared = grind.cleared;
  let garage = grind.garage;
  let clearedNodeId: string | null = null;
  let unlockedNodeIds: string[] = [];

  const now = Date.now();
  const justCleared = next >= node.xp && !grind.cleared.includes(nodeId);
  if (justCleared) {
    cleared = [...grind.cleared, nodeId];
    garage = [
      ...grind.garage,
      { name: node.name, unlock: node.unlock, t: now },
    ];
    clearedNodeId = nodeId;
    unlockedNodeIds = grind.tree.nodes
      .filter(
        (n) =>
          !cleared.includes(n.id) &&
          n.requires.includes(nodeId) &&
          n.requires.every((req) => cleared.includes(req))
      )
      .map((n) => n.id);
  }

  const newGrind: Grind = {
    ...grind,
    progress,
    cleared,
    garage,
    lootLog,
    runLog,
    reps: grind.reps + 1,
    minutes: grind.minutes + minutes,
    earnedXP: (grind.earnedXP ?? 0) + gain, // monotonic (milestones)
    xpBalance: (grind.xpBalance ?? 0) + gain, // spendable/decayable (level)
    lastActiveAt: now,
  };

  return {
    grind: newGrind,
    result: { base, loot, gain, clearedNodeId, unlockedNodeIds },
  };
}

export function allCleared(grind: Grind): boolean {
  return grind.tree.nodes.length > 0 && grind.cleared.length >= grind.tree.nodes.length;
}

// Total XP earned across a list of grinds (monotonic — for milestones)
export function totalEarnedXP(grinds: Grind[]): number {
  return grinds.reduce((s, g) => s + (g.earnedXP ?? 0), 0);
}

// Total spendable balance across grinds (decayable — drives the account level)
export function totalBalanceXP(grinds: Grind[]): number {
  return grinds.reduce((s, g) => s + Math.max(0, g.xpBalance ?? g.earnedXP ?? 0), 0);
}

// ---- XP decay on inactivity (spec: rust after a grace period) ----
const GRACE_DAYS = 2;
const DAY_MS = 86_400_000;
const NODE_DECAY_PER_DAY = 0.05; // 5% of current node progress per idle day
const BALANCE_DECAY_PER_DAY = 0.02; // 2% of balance per idle day

export interface DecayResult {
  grind: Grind;
  daysIdle: number;
  xpLost: number;
  nodesRusted: number;
}

// Apply decay for whole idle days beyond the grace period. Cleared nodes are
// safe; non-cleared node progress and the spendable balance rust gently.
export function applyDecay(grind: Grind, now = Date.now()): DecayResult {
  const since = Math.max(grind.lastActiveAt ?? now, grind.decayedAt ?? 0);
  const idleMs = now - since;
  const days = Math.floor(idleMs / DAY_MS);
  const decayDays = days - GRACE_DAYS;
  if (decayDays <= 0) {
    return { grind, daysIdle: Math.max(0, days), xpLost: 0, nodesRusted: 0 };
  }

  const nodeFactor = Math.pow(1 - NODE_DECAY_PER_DAY, decayDays);
  const balFactor = Math.pow(1 - BALANCE_DECAY_PER_DAY, decayDays);

  const progress: Record<string, number> = { ...grind.progress };
  let nodesRusted = 0;
  for (const node of grind.tree.nodes) {
    if (grind.cleared.includes(node.id)) continue;
    const cur = progress[node.id] ?? 0;
    if (cur <= 0) continue;
    const next = Math.max(0, Math.round(cur * nodeFactor));
    if (next !== cur) {
      progress[node.id] = next;
      nodesRusted++;
    }
  }

  const prevBal = Math.max(0, grind.xpBalance ?? grind.earnedXP ?? 0);
  const nextBal = Math.max(0, Math.round(prevBal * balFactor));
  const xpLost = prevBal - nextBal;

  const newGrind: Grind = {
    ...grind,
    progress,
    xpBalance: nextBal,
    decayedAt: now,
  };
  return { grind: newGrind, daysIdle: days, xpLost, nodesRusted };
}

// ---- Account-level bets (stake drawn from the whole account balance) ----
// Bets live on the global Profile; the stake is held in profile.xpAdjust so it
// comes out of the account level, not a single project's balance.

// Place a bet. `available` is the current account balance (level XP). Returns a
// new profile with the stake held out, or null if invalid.
export function placeBet(
  profile: Profile,
  available: number,
  slug: string,
  nodeId: string,
  nodeName: string,
  stake: number,
  deadline: number
): Profile | null {
  const s = Math.round(stake);
  if (s <= 0 || s > available) return null;
  if (
    profile.bets.some(
      (b) => b.status === "open" && b.slug === slug && b.nodeId === nodeId
    )
  ) {
    return null; // one open bet per node
  }
  const bet: Bet = {
    id: `bet${Date.now()}`,
    slug,
    nodeId,
    nodeName,
    stake: s,
    deadline,
    createdAt: Date.now(),
    status: "open",
  };
  return {
    ...profile,
    xpAdjust: (profile.xpAdjust ?? 0) - s,
    bets: [...profile.bets, bet],
  };
}

// When was a node cleared? (from its garage entry; undefined if not cleared)
function clearedAt(grind: Grind | undefined, nodeName: string): number | undefined {
  if (!grind) return undefined;
  const entries = grind.garage.filter((g) => g.name === nodeName);
  return entries.length ? entries[entries.length - 1].t : undefined;
}

export interface ResolveResult {
  profile: Profile;
  won: Bet[];
  lost: Bet[];
}

// Settle open bets against the grinds: win if the node was cleared on time,
// lose if the deadline passed without clearing. Winnings/refunds go to xpAdjust.
export function resolveBets(
  profile: Profile,
  grinds: Grind[],
  now = Date.now()
): ResolveResult {
  const bySlug = new Map(grinds.map((g) => [g.slug, g]));
  const won: Bet[] = [];
  const lost: Bet[] = [];
  let delta = 0;

  const bets = profile.bets.map((b) => {
    if (b.status !== "open") return b;
    const g = bySlug.get(b.slug);
    const clr = clearedAt(g, b.nodeName);
    if (clr !== undefined && clr <= b.deadline) {
      const payout = b.stake + Math.round(b.stake * BET_WIN_BONUS);
      delta += payout;
      const w: Bet = { ...b, status: "won", payout, resolvedAt: now };
      won.push(w);
      return w;
    }
    if (now > b.deadline) {
      const back = Math.round(b.stake * BET_LOSS_REFUND);
      delta += back;
      const l: Bet = {
        ...b,
        status: "lost",
        payout: -(b.stake - back),
        resolvedAt: now,
      };
      lost.push(l);
      return l;
    }
    return b;
  });

  if (!won.length && !lost.length) return { profile, won, lost };
  return {
    profile: { ...profile, bets, xpAdjust: (profile.xpAdjust ?? 0) + delta },
    won,
    lost,
  };
}

// ---- Account level (lifetime XP → level) ----
// Level L starts at 50*(L-1)^2 XP; each level is progressively longer.
export function xpToLevel(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}

export interface LevelProgress {
  level: number;
  inLevel: number; // XP earned within the current level
  span: number; // XP width of the current level
  pct: number; // 0..100 toward next level
  toNext: number; // XP remaining to next level
}

export function levelProgress(xp: number): LevelProgress {
  const level = xpToLevel(xp);
  const curStart = 50 * (level - 1) ** 2;
  const nextStart = 50 * level ** 2;
  const span = nextStart - curStart;
  const inLevel = Math.max(0, xp - curStart);
  return {
    level,
    inLevel,
    span,
    pct: Math.round((inLevel / span) * 100),
    toNext: Math.max(0, nextStart - xp),
  };
}

// Milestones whose threshold is crossed between prevXP and nextXP and not yet hit.
export function detectHitMilestones(
  prevXP: number,
  nextXP: number,
  milestones: Milestone[]
): Milestone[] {
  return milestones.filter(
    (m) => !m.hitAt && m.xpTarget > prevXP && m.xpTarget <= nextXP
  );
}
