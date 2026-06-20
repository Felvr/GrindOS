import { xpForHours } from "./engine";
import type {
  Difficulty,
  DifficultyRequest,
  GeneratedTree,
  GrindType,
  MatchSuggestion,
  TreeNode,
} from "./types";

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  if (typeof v === "string" && v.trim()) return [v];
  return [];
}

// Max nodes allowed per difficulty (spine length).
const MAX_NODES: Record<Difficulty, number> = { easy: 4, medium: 6, hard: 9 };

function coerceDifficulty(v: unknown, fallback: Difficulty): Difficulty {
  return v === "easy" || v === "medium" || v === "hard" ? v : fallback;
}

// Does following `requires` edges from `start` reach `target`? (cycle check)
function reaches(
  start: string,
  target: string,
  reqOf: Map<string, string[]>,
  seen = new Set<string>()
): boolean {
  if (start === target) return true;
  if (seen.has(start)) return false;
  seen.add(start);
  for (const r of reqOf.get(start) ?? []) {
    if (reaches(r, target, reqOf, seen)) return true;
  }
  return false;
}

// Validate/repair a manually-edited node set: clamp tier/xp, drop self/dangling/
// cycle-forming requires, renumber steps by tier, set the project boss. Unlike
// normalizeTree it does NOT force-link orphans — a node may be a new root.
export function sanitizeNodes(
  nodes: TreeNode[],
  type: GrindType
): TreeNode[] {
  const out = nodes.map((n) => ({
    ...n,
    tier: clamp(Math.round(Number(n.tier ?? 1)), 1, 4),
    xp: clamp(Math.round(Number(n.xp ?? 100)), 30, 3000),
    requires: Array.isArray(n.requires) ? [...n.requires] : [],
    boss: false,
  }));

  const ids = new Set(out.map((n) => n.id));
  const reqOf = new Map(out.map((n) => [n.id, n.requires]));

  for (const node of out) {
    const kept: string[] = [];
    for (const r of node.requires) {
      if (r === node.id || !ids.has(r)) continue; // self / dangling
      if (reaches(r, node.id, reqOf)) continue; // would form a cycle
      kept.push(r);
    }
    node.requires = kept;
    reqOf.set(node.id, kept);
  }

  // order by tier then existing step, renumber steps contiguously
  out.sort((a, b) => a.tier - b.tier || (a.step ?? 99) - (b.step ?? 99));
  out.forEach((n, i) => (n.step = i + 1));

  if (type === "project" && out.length) out[out.length - 1].boss = true;
  return out;
}

// Defensive parse: strip ```json fences, take from first "{" to last "}".
export function extractJson(raw: string): string {
  let s = raw.trim();
  s = s.replace(/```json/gi, "").replace(/```/g, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) return s;
  return s.slice(first, last + 1);
}

// Normalize an arbitrary parsed object into a valid GeneratedTree.
export function normalizeTree(
  parsed: any,
  topic: string,
  requested: DifficultyRequest = "auto"
): GeneratedTree {
  const type: GrindType = parsed?.type === "project" ? "project" : "skill";

  // difficulty: honor an explicit user choice; otherwise trust the model, default medium.
  const difficulty: Difficulty =
    requested !== "auto"
      ? requested
      : coerceDifficulty(parsed?.difficulty, "medium");

  const title =
    typeof parsed?.title === "string" && parsed.title.trim()
      ? parsed.title.trim()
      : topic;
  const summary =
    typeof parsed?.summary === "string" ? parsed.summary.trim() : "";

  const rawNodes: any[] = Array.isArray(parsed?.nodes) ? parsed.nodes : [];
  const seen = new Set<string>();
  let nodes: TreeNode[] = rawNodes.slice(0, MAX_NODES[difficulty]).map((n, i) => {
    let id =
      typeof n?.id === "string" && n.id.trim() ? n.id.trim() : `n${i + 1}`;
    while (seen.has(id)) id = `${id}_${i}`;
    seen.add(id);
    return {
      id,
      name:
        typeof n?.name === "string" && n.name.trim()
          ? n.name.trim()
          : `Узел ${i + 1}`,
      tier: clamp(Math.round(Number(n?.tier ?? 1)), 1, 4),
      step: clamp(Math.round(Number(n?.step ?? i + 1)), 1, 99),
      requires: asStringArray(n?.requires),
      grind:
        typeof n?.grind === "string" && n.grind.trim()
          ? n.grind.trim()
          : "Выполнить этот шаг плана.",
      repeatable: n?.repeatable === true,
      // prefer the AI's effort estimate (hours) so XP reflects real time-on-task
      xp:
        n?.hours != null && Number(n.hours) > 0
          ? xpForHours(Number(n.hours))
          : clamp(Math.round(Number(n?.xp ?? 100)), 30, 3000),
      unlock:
        typeof n?.unlock === "string" && n.unlock.trim()
          ? n.unlock.trim()
          : "Новая способность по теме.",
    } as TreeNode;
  });

  // Order along the main path: tier, then step, then original order.
  nodes.sort((a, b) => a.tier - b.tier || (a.step ?? 99) - (b.step ?? 99));
  nodes.forEach((n, i) => (n.step = i + 1)); // renumber 1..N contiguously

  // Drop dangling/self requires.
  const ids = new Set(nodes.map((n) => n.id));
  for (const node of nodes) {
    node.requires = node.requires.filter((r) => ids.has(r) && r !== node.id);
  }

  // Enforce connectivity: every node except the first must depend on an EARLIER
  // node. Orphans get linked to the previous node in path order — no islands.
  for (let i = 1; i < nodes.length; i++) {
    const earlier = new Set(nodes.slice(0, i).map((n) => n.id));
    nodes[i].requires = nodes[i].requires.filter((r) => earlier.has(r));
    if (nodes[i].requires.length === 0) {
      nodes[i].requires = [nodes[i - 1].id];
    }
  }
  // First node is always a root.
  if (nodes.length) nodes[0].requires = [];

  // project: the last node in path order is the boss.
  if (type === "project" && nodes.length) {
    nodes[nodes.length - 1].boss = true;
  }

  const rawMatches: any[] = Array.isArray(parsed?.matches) ? parsed.matches : [];
  const matches: MatchSuggestion[] = rawMatches.slice(0, 3).map((m, i) => ({
    atTier: clamp(Math.round(Number(m?.atTier ?? 1)), 1, 4),
    name:
      typeof m?.name === "string" && m.name.trim()
        ? m.name.trim()
        : `Матч ${i + 1}`,
    how:
      typeof m?.how === "string" && m.how.trim()
        ? m.how.trim()
        : "Применить навык в реальной ситуации и оценить себя 0–100.",
  }));

  return { type, difficulty, title, summary, nodes, matches };
}
