// The edges between entries, and the queries that read them.
//
// Entries used to be a flat list of rows: a bug recorded on Tuesday and the fix
// recorded an hour later had nothing connecting them, so "where did this get
// fixed" had no answer and neither did "is this still open". Three fields carry
// the structure — `supersedes` (this corrects that), `fixes` (this closes that)
// and `sessionId` (these happened in one episode of work) — and everything here
// is a pure read over entries already loaded, so the CLI, the MCP server and the
// dashboard all derive the same shape from the same rules.

import type { Entry } from './types';
import { normalizeType } from './types';

/** An entry named in a prompt or a graph label: just enough to identify it. */
export interface EntryRef {
  id: string;
  title: string;
}

/**
 * Bugs recorded in this session that nothing has closed yet.
 *
 * Used to offer the `fixes` link at the moment the agent is writing a fix. The
 * window is the session on purpose: a bug from last month is not something the
 * agent can be expected to recognise as the one it just fixed, and offering a
 * long list of stale ids would get the whole hint ignored.
 *
 * Newest first, because the bug being worked on is nearly always the last one
 * written down.
 */
export function openBugsInSession(entries: readonly Entry[], sessionId: string): EntryRef[] {
  if (!sessionId) return [];
  const closed = new Set(entries.map(e => e.fixes).filter((id): id is string => !!id));
  return entries
    .filter(e => e.sessionId === sessionId)
    .filter(e => normalizeType(e.type) === 'bug')
    .filter(e => !closed.has(e.id) && !e.supersededBy)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(e => ({ id: e.id, title: e.title }));
}

// ── the graph ─────────────────────────────────────────────────────────────────
//
// Two kinds of edge, and the difference matters when reading the picture.
//
// Recorded edges were stated by the agent that did the work: this fix closed
// that bug, this entry corrects that one. They are facts.
//
// Inferred edges are DevBrain noticing that two entries share something — the
// same error text, the same cause, the same session. They are a suggestion that
// these belong together, and they can be wrong. They exist because recorded
// edges only start accumulating after this code ships, and a graph that is
// empty for a month is a graph nobody opens again.

export type EdgeKind =
  /** Recorded: the target bug, closed by the source. */
  | 'fixes'
  /** Recorded: the target was wrong, and the source replaces it. */
  | 'supersedes'
  /** Inferred: recorded one after the other in the same session. */
  | 'sequence'
  /** Inferred: the same error text, which is what recall matches on. */
  | 'same-error'
  /** Inferred: different symptoms, same underlying cause. */
  | 'same-cause';

export interface GraphNode {
  id: string;
  type: string;
  title: string;
  createdAt: number;
  projectId: string;
  /** Session this was recorded in, when known — the column it belongs to. */
  sessionId?: string;
  /** Retracted entries are drawn, faded: the correction is only readable next to what it corrected. */
  superseded: boolean;
  /** Times this was handed to an agent on a real failure. The only count that shows it earned its place. */
  recalls: number;
  errorPattern?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: EdgeKind;
  /** What the two have in common, for an inferred edge. Shown on hover. */
  because?: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Recorded edges are facts; inferred ones are DevBrain's guess. */
export const RECORDED_EDGES: readonly EdgeKind[] = ['fixes', 'supersedes'];

export function isRecorded(kind: EdgeKind): boolean {
  return RECORDED_EDGES.includes(kind);
}

/**
 * Error text, reduced to what two failures would have in common.
 *
 * Paths, line numbers, hex addresses and quoted identifiers differ between two
 * occurrences of the same error, so comparing raw text finds almost nothing.
 */
function errorKey(pattern: string): string {
  return pattern
    .toLowerCase()
    .replace(/0x[0-9a-f]+/g, '')
    .replace(/\d+/g, '')
    .replace(/['"`][^'"`]*['"`]/g, '')
    .replace(/[^a-z\s]+/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 8)
    .join(' ')
    .trim();
}

/**
 * Edges deliberately left undrawn past this many sharing one key.
 *
 * Thirty entries with the same archetype would be 435 lines, which is not a
 * graph but a smear — and the one real connection in it becomes invisible.
 */
const MAX_GROUP = 6;

function pairsWithin<T>(items: T[]): [T, T][] {
  const out: [T, T][] = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) out.push([items[i], items[j]]);
  return out;
}

/** Group entries by a key, dropping the ones with no key and the groups of one. */
function groupBy(entries: readonly Entry[], key: (e: Entry) => string | undefined): Map<string, Entry[]> {
  const groups = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = key(e);
    if (!k) continue;
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  for (const [k, group] of groups) if (group.length < 2 || group.length > MAX_GROUP) groups.delete(k);
  return groups;
}

/**
 * Build the graph for a set of entries, oldest first.
 *
 * Pure: everything is derived from the entries handed in, so the dashboard, a
 * CLI view and a test all see the same graph for the same input.
 */
export function buildGraph(entries: readonly Entry[]): KnowledgeGraph {
  const byId = new Map(entries.map(e => [e.id, e]));
  const ordered = [...entries].sort((a, b) => a.createdAt - b.createdAt);

  const nodes: GraphNode[] = ordered.map(e => ({
    id: e.id,
    type: normalizeType(e.type),
    title: e.title,
    createdAt: e.createdAt,
    projectId: e.projectId,
    ...(e.sessionId ? { sessionId: e.sessionId } : {}),
    superseded: !!e.supersededBy,
    recalls: e.recallCount ?? 0,
    ...(e.errorPattern ? { errorPattern: e.errorPattern } : {}),
  }));

  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  const add = (edge: GraphEdge) => {
    // One line per pair. A recorded edge wins: it says something definite,
    // where "same session" only says the two happened near each other.
    const pair = [edge.from, edge.to].sort().join('>');
    if (seen.has(pair)) return;
    seen.add(pair);
    edges.push(edge);
  };

  // Recorded first, so they claim their pair before anything inferred can.
  for (const e of ordered) {
    if (e.fixes && byId.has(e.fixes)) add({ from: e.id, to: e.fixes, kind: 'fixes' });
  }
  // Both directions of the same fact. `supersededBy` is the one actually
  // written — supersedeEntry stamps the retracted entry and nothing fills in
  // `supersedes` on the correction — so reading only the forward field found
  // none of the 8 retractions in a real store.
  for (const e of ordered) {
    if (e.supersedes && byId.has(e.supersedes)) add({ from: e.id, to: e.supersedes, kind: 'supersedes' });
    if (e.supersededBy && byId.has(e.supersededBy)) add({ from: e.supersededBy, to: e.id, kind: 'supersedes' });
  }

  // Consecutive within a session, not every pair: a session of ten entries is a
  // thread of work, and a thread is a line, not a knot of forty-five.
  const sessions = groupBy(ordered, e => e.sessionId);
  for (const [sessionId, group] of sessions) {
    const sorted = [...group].sort((a, b) => a.createdAt - b.createdAt);
    for (let i = 1; i < sorted.length; i++) {
      add({ from: sorted[i - 1].id, to: sorted[i].id, kind: 'sequence', because: `same session (${sessionId.slice(0, 8)})` });
    }
  }

  for (const [key, group] of groupBy(ordered, e => (e.errorPattern ? errorKey(e.errorPattern) : undefined))) {
    for (const [a, b] of pairsWithin(group)) add({ from: a.id, to: b.id, kind: 'same-error', because: `same error: ${key}` });
  }

  for (const [key, group] of groupBy(ordered, e => e.causeArchetype?.toLowerCase().trim())) {
    for (const [a, b] of pairsWithin(group)) add({ from: a.id, to: b.id, kind: 'same-cause', because: `same cause: ${key}` });
  }

  return { nodes, edges };
}

/**
 * The entries worth drawing, when there are more than a graph can show.
 *
 * Connected entries first: an isolated node carries no information a list does
 * not carry better, and five hundred of them hide the handful that connect.
 */
export function graphSubset(entries: readonly Entry[], limit = 120): Entry[] {
  const { edges } = buildGraph(entries);
  const connected = new Set(edges.flatMap(e => [e.from, e.to]));
  const score = (e: Entry) => (connected.has(e.id) ? 1 : 0);
  return [...entries]
    .sort((a, b) => score(b) - score(a) || b.createdAt - a.createdAt)
    .slice(0, limit);
}
