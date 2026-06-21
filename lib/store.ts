import {
  applyRun,
  detectHitMilestones,
  isAvailable,
  placeBet,
  resolveBets,
  rollLoot,
  totalBalanceXP,
  totalEarnedXP,
  type LootResult,
  type RunResult,
} from "./engine";
import type {
  Bet,
  DailyTask,
  GeneratedTree,
  Grind,
  GrindIndexEntry,
  Milestone,
  Profile,
} from "./types";

// local YYYY-MM-DD for "today"
function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export const DAILY_TASK_XP = 20;

const INDEX_KEY = "grindos:index";
const LAST_KEY = "grindos:last";
const PROFILE_KEY = "grindos:profile";
const grindKey = (slug: string) => `grindos:grind:${slug}`;

// In-memory fallback when localStorage is unavailable (SSR, private mode…).
const mem = new Map<string, string>();

function hasLS(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function read(key: string): string | null {
  if (hasLS()) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      /* fall through */
    }
  }
  return mem.has(key) ? mem.get(key)! : null;
}

function write(key: string, value: string): void {
  mem.set(key, value);
  if (hasLS()) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* memory-only */
    }
  }
}

function remove(key: string): void {
  mem.delete(key);
  if (hasLS()) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ---- slug ----
export function slugify(s: string): string {
  const base = s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "grind";
}

function uniqueSlug(title: string): string {
  const index = loadIndex();
  let slug = slugify(title);
  let i = 2;
  const taken = new Set(index.map((e) => e.slug));
  while (taken.has(slug)) slug = `${slugify(title)}-${i++}`;
  return slug;
}

// ---- index ----
export function loadIndex(): GrindIndexEntry[] {
  return parse<GrindIndexEntry[]>(read(INDEX_KEY), []);
}

function saveIndex(index: GrindIndexEntry[]): void {
  write(INDEX_KEY, JSON.stringify(index));
}

// Backfill fields added in later versions so older saves keep working.
function migrate(g: Grind | null): Grind | null {
  if (!g) return g;
  const earned = g.earnedXP ?? 0;
  return {
    ...g,
    earnedXP: earned,
    xpBalance: g.xpBalance ?? earned,
    lastActiveAt: g.lastActiveAt ?? g.createdAt ?? Date.now(),
    decayedAt: g.decayedAt ?? g.lastActiveAt ?? g.createdAt ?? Date.now(),
    bets: Array.isArray(g.bets) ? g.bets : [],
    runLog: Array.isArray(g.runLog) ? g.runLog : [],
    notes: g.notes ?? {},
    details: g.details ?? {},
  };
}

// ---- grind ----
export function loadGrind(slug: string): Grind | null {
  return migrate(parse<Grind | null>(read(grindKey(slug)), null));
}

export function saveGrind(grind: Grind): void {
  write(grindKey(grind.slug), JSON.stringify(grind));
  write(LAST_KEY, grind.slug);
  // keep index in sync
  const index = loadIndex();
  const entry: GrindIndexEntry = {
    slug: grind.slug,
    title: grind.title,
    type: grind.type,
    archived: grind.archived,
  };
  const i = index.findIndex((e) => e.slug === grind.slug);
  if (i === -1) index.push(entry);
  else index[i] = entry;
  saveIndex(index);
}

// Move a grind to/from the archive. Doesn't change the "last opened" pointer
// unless we're archiving the active grind, in which case we hand off to another.
export function setArchived(slug: string, archived: boolean): void {
  const g = loadGrind(slug);
  if (!g) return;
  write(grindKey(slug), JSON.stringify({ ...g, archived }));
  const index = loadIndex();
  const i = index.findIndex((e) => e.slug === slug);
  if (i >= 0) {
    index[i] = { ...index[i], archived };
    saveIndex(index);
  }
  if (archived && read(LAST_KEY) === slug) {
    const next = index.filter((e) => !e.archived && e.slug !== slug);
    if (next.length) write(LAST_KEY, next[next.length - 1].slug);
    else remove(LAST_KEY);
  }
}

export function deleteGrind(slug: string): void {
  remove(grindKey(slug));
  const index = loadIndex().filter((e) => e.slug !== slug);
  saveIndex(index);
  if (read(LAST_KEY) === slug) remove(LAST_KEY);
}

export function loadAllGrinds(): Grind[] {
  return loadIndex()
    .map((e) => loadGrind(e.slug))
    .filter((g): g is Grind => g !== null);
}

// Account level reflects the spendable balance (so decay/bets move it).
// Account balance/level: grind balances + bet adjustments, never below 0.
export function lifetimeXP(): number {
  return Math.max(0, totalBalanceXP(loadAllGrinds()) + (loadProfile().xpAdjust ?? 0));
}

// Monotonic total ever earned — used for milestone unlocks so decay can't undo them.
export function lifetimeEarned(): number {
  return totalEarnedXP(loadAllGrinds()) + (loadProfile().earnedAdjust ?? 0);
}

export interface CommitRunResult {
  grind: Grind;
  result: RunResult;
  hitMilestones: Milestone[];
  wonBets: Bet[];
  lostBets: Bet[];
}

// Apply a focus run to a grind by slug, persist it, settle global milestones and
// resolve any account-level bets affected by a clear. Shared by the live hook and
// the background focus timer so they behave identically.
export function commitRun(
  slug: string,
  nodeId: string,
  minutes: number,
  phoneFree: boolean
): CommitRunResult | null {
  const g = loadGrind(slug);
  if (!g) return null;
  const prevEarned = lifetimeEarned();
  const { grind: next, result } = applyRun(g, nodeId, minutes, phoneFree);
  saveGrind(next);

  let profile = loadProfile();

  // milestones (monotonic earned)
  const hit = detectHitMilestones(prevEarned, lifetimeEarned(), profile.milestones);
  if (hit.length) {
    const ids = new Set(hit.map((m) => m.id));
    const at = Date.now();
    profile = {
      ...profile,
      milestones: profile.milestones.map((m) =>
        ids.has(m.id) ? { ...m, hitAt: at } : m
      ),
    };
  }

  // bets (account-level) — a clear may win an open bet
  const r = resolveBets(profile, loadAllGrinds());
  profile = r.profile;

  if (hit.length || r.won.length || r.lost.length) saveProfile(profile);

  return {
    grind: next,
    result,
    hitMilestones: hit,
    wonBets: r.won,
    lostBets: r.lost,
  };
}

// Place an account-level bet (stake drawn from the whole account balance).
export function placeBetStore(
  slug: string,
  nodeId: string,
  nodeName: string,
  stake: number,
  deadline: number
): boolean {
  const profile = loadProfile();
  const next = placeBet(
    profile,
    lifetimeXP(),
    slug,
    nodeId,
    nodeName,
    stake,
    deadline
  );
  if (!next) return false;
  saveProfile(next);
  return true;
}

// Settle expired/won bets (called on load); returns what changed.
export function resolveBetsStore(): { won: Bet[]; lost: Bet[] } {
  const r = resolveBets(loadProfile(), loadAllGrinds());
  if (r.won.length || r.lost.length) saveProfile(r.profile);
  return { won: r.won, lost: r.lost };
}

// ---- profile (global milestones) ----
const SEED_MILESTONES: Profile["milestones"] = [
  { id: "m1", xpTarget: 500, reward: "Любимый перекус 🍫" },
  { id: "m2", xpTarget: 2000, reward: "Вечер сериала без вины 🎬" },
  { id: "m3", xpTarget: 5000, reward: "Купить что-то для хобби 🎁" },
];

const emptyDaily = (): Profile["daily"] => ({
  date: todayKey(),
  tasks: [],
  claimed: false,
});

function freshProfile(): Profile {
  return {
    milestones: SEED_MILESTONES,
    bets: [],
    xpAdjust: 0,
    earnedAdjust: 0,
    daily: emptyDaily(),
    xpLog: [],
  };
}

export function loadProfile(): Profile {
  const p = parse<Profile | null>(read(PROFILE_KEY), null);
  if (p && Array.isArray(p.milestones)) {
    // backfill fields added in later versions
    return {
      ...p,
      bets: Array.isArray(p.bets) ? p.bets : [],
      xpAdjust: typeof p.xpAdjust === "number" ? p.xpAdjust : 0,
      earnedAdjust: typeof p.earnedAdjust === "number" ? p.earnedAdjust : 0,
      daily: p.daily && Array.isArray(p.daily.tasks) ? p.daily : emptyDaily(),
      xpLog: Array.isArray(p.xpLog) ? p.xpLog : [],
    };
  }
  const seeded = freshProfile();
  saveProfile(seeded);
  return seeded;
}

export function saveProfile(profile: Profile): void {
  write(PROFILE_KEY, JSON.stringify(profile));
}

// ---- daily tasks ----
function addXpLog(profile: Profile, amount: number): Profile {
  return {
    ...profile,
    xpLog: [...profile.xpLog, { t: Date.now(), amount }].slice(-200),
  };
}

// Reset the daily list when the date rolls over, and auto-seed it with one
// random project quest for the day. Runs once per day (the reset branch only
// fires on the first call after midnight).
export function loadDaily(): Profile {
  const p = loadProfile();
  if (p.daily.date !== todayKey()) {
    const tasks: DailyTask[] = [];
    const pool = availableQuests();
    if (pool.length) {
      const q = pool[Math.floor(Math.random() * pool.length)];
      tasks.push({
        id: `t${Date.now()}`,
        text: q.name,
        done: false,
        ref: { slug: q.slug, nodeId: q.nodeId },
      });
    }
    const next: Profile = {
      ...p,
      daily: { date: todayKey(), tasks, claimed: false },
    };
    saveProfile(next);
    return next;
  }
  return p;
}

export function addDailyTask(
  text: string,
  ref?: { slug: string; nodeId: string }
): Profile {
  const p = loadDaily();
  const t = text.trim();
  if (!t) return p;
  const next: Profile = {
    ...p,
    daily: {
      ...p.daily,
      tasks: [
        ...p.daily.tasks,
        { id: `t${Date.now()}`, text: t, done: false, ...(ref ? { ref } : {}) },
      ],
    },
  };
  saveProfile(next);
  return next;
}

// Actionable quests across all non-archived projects (available, not cleared) —
// for adding to the daily list (manually or at random).
export interface QuestCandidate {
  slug: string;
  title: string; // project title
  nodeId: string;
  name: string; // quest name
}

export function availableQuests(): QuestCandidate[] {
  const out: QuestCandidate[] = [];
  for (const g of loadAllGrinds()) {
    if (g.archived) continue;
    for (const node of g.tree.nodes) {
      if (isAvailable(g, node)) {
        out.push({ slug: g.slug, title: g.title, nodeId: node.id, name: node.name });
      }
    }
  }
  return out;
}

// Add a random available quest to today's list (skips ones already added). Returns
// the updated profile, or null if there are no candidates left.
export function addRandomQuestToDaily(): Profile | null {
  const p = loadDaily();
  const linked = new Set(
    p.daily.tasks.filter((t) => t.ref).map((t) => `${t.ref!.slug}:${t.ref!.nodeId}`)
  );
  const pool = availableQuests().filter(
    (q) => !linked.has(`${q.slug}:${q.nodeId}`)
  );
  if (!pool.length) return null;
  const q = pool[Math.floor(Math.random() * pool.length)];
  return addDailyTask(q.name, { slug: q.slug, nodeId: q.nodeId });
}

export function removeDailyTask(id: string): Profile {
  const p = loadDaily();
  const next: Profile = {
    ...p,
    daily: { ...p.daily, tasks: p.daily.tasks.filter((x) => x.id !== id) },
  };
  saveProfile(next);
  return next;
}

// Toggle a task; completing grants +DAILY_TASK_XP to the account (undo reverts it).
export function toggleDailyTask(id: string): Profile {
  const p = loadDaily();
  const task = p.daily.tasks.find((x) => x.id === id);
  if (!task) return p;
  const nowDone = !task.done;
  const delta = nowDone ? DAILY_TASK_XP : -DAILY_TASK_XP;
  let next: Profile = {
    ...p,
    daily: {
      ...p.daily,
      tasks: p.daily.tasks.map((x) => (x.id === id ? { ...x, done: nowDone } : x)),
    },
    xpAdjust: (p.xpAdjust ?? 0) + delta,
    earnedAdjust: (p.earnedAdjust ?? 0) + delta,
  };
  next = addXpLog(next, delta);
  saveProfile(next);
  return next;
}

export interface DayLootResult {
  profile: Profile;
  loot: LootResult;
  bonus: number;
}

// Claim the day-completion reward: requires all tasks done and not yet claimed.
export function claimDayLoot(): DayLootResult | null {
  const p = loadDaily();
  const all = p.daily.tasks;
  if (p.daily.claimed || all.length === 0 || !all.every((t) => t.done)) return null;
  // base scales a bit with how many tasks were done; phone-free skew off
  const base = 40 + all.length * 10;
  const loot = rollLoot(base, false);
  const bonus = base + loot.bonus;
  let next: Profile = {
    ...p,
    daily: { ...p.daily, claimed: true },
    xpAdjust: (p.xpAdjust ?? 0) + bonus,
    earnedAdjust: (p.earnedAdjust ?? 0) + bonus,
  };
  next = addXpLog(next, bonus);
  saveProfile(next);
  return { profile: next, loot, bonus };
}

export function loadLast(): Grind | null {
  const slug = read(LAST_KEY);
  const g = slug ? loadGrind(slug) : null;
  if (g && !g.archived) return g;
  // no pointer or it points at an archived grind → newest non-archived
  const active = loadIndex().filter((e) => !e.archived);
  if (active.length) return loadGrind(active[active.length - 1].slug);
  return g; // fall back to whatever we had (may be archived or null)
}

export function setLast(slug: string): void {
  write(LAST_KEY, slug);
}

// ---- factory ----
export function createGrind(gen: GeneratedTree): Grind {
  const now = Date.now();
  const slug = uniqueSlug(gen.title);
  return {
    slug,
    title: gen.title,
    type: gen.type,
    difficulty: gen.difficulty,
    summary: gen.summary,
    createdAt: now,
    draft: gen.draft,
    tree: { nodes: gen.nodes, matches: gen.matches },
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
    notes: {},
    details: {},
    prestigeMult: 1,
  };
}
