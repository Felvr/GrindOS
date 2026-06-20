// ---- Core data model ----

export type GrindType = "skill" | "project";
export type Difficulty = "easy" | "medium" | "hard";

export interface TreeNode {
  id: string;
  name: string;
  tier: number; // 1..4
  step?: number; // order along the main path (1..n)
  requires: string[];
  grind: string; // the concrete action for this step (what to do)
  repeatable?: boolean; // true when this step is a drill to repeat, not a one-off
  xp: number; // focus target to complete this step
  unlock: string;
  boss?: boolean;
}

// Lazy AI deep-dive for a node, cached per nodeId on the grind.
export interface NodeDetail {
  steps: string[];
  tips: string[];
  resources: string[];
  generatedAt: number;
}

export interface MatchSuggestion {
  atTier: number;
  name: string;
  how: string;
}

export interface Tree {
  nodes: TreeNode[];
  matches: MatchSuggestion[];
}

export interface GarageItem {
  name: string;
  unlock: string;
  t: number;
}

export interface MatchRecord {
  name: string;
  score: number; // 0..100
  t: number;
}

export type Rarity = "junk" | "uncommon" | "rare" | "epic" | "legendary";

export interface LootEntry {
  rarity: Rarity;
  t: number;
}

// Run history entry for a specific node
export interface RunEntry {
  nodeId: string;
  minutes: number;
  phoneFree: boolean;
  gain: number;
  rarity: Rarity;
  t: number;
}

// A humane wager: stake XP that a node gets cleared by a deadline.
export type BetStatus = "open" | "won" | "lost";
export interface Bet {
  id: string;
  slug: string; // which grind the node belongs to
  nodeId: string;
  nodeName: string;
  stake: number;
  deadline: number; // timestamp
  createdAt: number;
  status: BetStatus;
  payout?: number; // signed XP delta applied on resolution
  resolvedAt?: number;
}

export interface Grind {
  slug: string;
  title: string;
  type: GrindType;
  difficulty: Difficulty;
  summary: string;
  createdAt: number;
  draft?: boolean;
  tree: Tree;
  progress: Record<string, number>;
  cleared: string[];
  garage: GarageItem[];
  matches: MatchRecord[];
  reps: number;
  minutes: number;
  earnedXP: number; // monotonic total ever earned — drives milestone unlocks
  xpBalance: number; // spendable/decayable balance — drives account level & bets
  lastActiveAt: number; // last run timestamp (for decay grace)
  decayedAt: number; // last time decay was applied
  bets: Bet[];
  lootLog: LootEntry[];
  runLog: RunEntry[]; // per-node run history
  notes: Record<string, string>; // personal notes per node
  details: Record<string, NodeDetail>; // cached AI deep-dive per node
  prestigeMult: number;
  archived?: boolean;
}

export interface GrindIndexEntry {
  slug: string;
  title: string;
  type: GrindType;
  archived?: boolean;
}

export interface GeneratedTree {
  type: GrindType;
  difficulty: Difficulty;
  title: string;
  summary: string;
  nodes: TreeNode[];
  matches: MatchSuggestion[];
  draft?: boolean;
}

// ---- XP milestone rewards ----
export interface Milestone {
  id: string;
  xpTarget: number;
  reward: string; // user-defined real-world reward
  hitAt?: number; // timestamp when achieved
}

// Global, cross-grind account profile (lifetime XP feeds these milestones).
export interface Profile {
  milestones: Milestone[];
  bets: Bet[]; // account-level wagers (stake drawn from the whole account)
  xpAdjust: number; // signed account-balance adjustment from held/settled bets
}

// Difficulty request from the UI: "auto" lets the AI classify.
export type DifficultyRequest = Difficulty | "auto";

// ---- Mini-test (quiz) for the match curve ----
export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number; // index into options
  explain?: string;
}

export interface Quiz {
  questions: QuizQuestion[];
}
