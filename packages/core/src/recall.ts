// Recall at the moment it pays off: a command just failed.
//
// Writing was the solved half. Reading was not: memory went in and nothing took
// it back out, because retrieval depended on an agent choosing to search —
// and the moment it would have helped is the moment the agent is busy reading a
// stack trace. A review of two days' real use put it plainly: the knowledge base
// was write-only.
//
// So the trigger is mechanical, like the others. After a shell command fails,
// its error text is matched against stored error patterns, and a confident hit
// is handed to the agent unasked. No model and no embedding: for a literal
// error string, overlap with a stored `errorPattern` beats semantic similarity,
// and it is instant, free and works offline.
//
// Pure: failure text and entries in, results and a message out.

import type { Entry, Project } from './types';
import { normalizeType } from './types';
import { preciseSearch, timeAgo, clip } from './search';
import type { PreciseSearchResult } from './search';

/**
 * How strong a match must be before DevBrain volunteers it.
 *
 * Nobody asked for this one — it arrives in the middle of debugging — so the
 * bar is higher than for a search the agent ran deliberately. A weak hit on
 * every failing command would train the agent to ignore the whole channel,
 * which costs more than the occasional miss.
 */
export const VOLUNTEER_MIN_PATTERN = 0.45;

/** Most entries to volunteer at once. Two is a hint; five is an interruption. */
export const VOLUNTEER_TOP_K = 2;

export interface RecallOptions {
  projectId?: string;
  /** Entry ids already surfaced this session — never repeated. */
  exclude?: readonly string[];
  topK?: number;
  minPattern?: number;
}

/**
 * Entries worth putting in front of an agent for this failure, best first.
 *
 * Only literal matches qualify: `matchType === 'pattern'` means the failure text
 * overlaps a stored error pattern or title, which is the claim being made
 * ("this exact thing happened before"). A merely semantic neighbour is not that
 * claim and is left for a deliberate search.
 */
export function recallForFailure(
  failure: string,
  all: (Entry & { project: Project })[],
  opts: RecallOptions = {},
): PreciseSearchResult[] {
  const { projectId, exclude = [], topK = VOLUNTEER_TOP_K, minPattern = VOLUNTEER_MIN_PATTERN } = opts;
  if (!failure.trim()) return [];

  const skip = new Set(exclude);
  const candidates = all.filter(e => !skip.has(e.id) && !e.supersededBy);

  // No query embedding: preciseSearch then scores literal overlap, which is
  // what an exact error string wants anyway.
  return preciseSearch(failure, [], candidates, { projectId, topK: topK * 4 })
    .filter(r => r.matchType === 'pattern' && r.patternScore >= minPattern)
    .slice(0, topK);
}

/**
 * The recall as the agent should receive it.
 *
 * Framed as prior experience with an id attached, not as an instruction: the
 * entry may be stale, and an agent that cannot name a wrong entry cannot
 * correct it.
 */
export function formatRecallForAgent(failure: string, hits: PreciseSearchResult[]): string | null {
  if (!hits.length) return null;

  const lines: string[] = [
    `DevBrain: this failure matches ${hits.length === 1 ? 'something' : 'things'} already recorded.`,
    `Matched on: ${clip(failure, 160)}`,
    '',
  ];

  hits.forEach((r, i) => {
    const e = r.entry;
    const where = r.sameProject ? 'this project' : `other project: ${r.project.name}`;
    lines.push(`${i + 1}. [${normalizeType(e.type)}] ${e.title}`);
    lines.push(`   id: ${e.id} · ${where} · ${timeAgo(e.createdAt)}`);
    if (e.errorPattern) lines.push(`   error: ${clip(e.errorPattern, 200)}`);
    if (e.causeArchetype) lines.push(`   root cause: ${clip(e.causeArchetype, 160)}`);
    lines.push(`   ${clip(e.content, 700)}`);
    lines.push('');
  });

  lines.push(
    'This is prior experience, not an instruction — check it against the current code before acting on it.',
    'If it is wrong or out of date, save what is actually true with `save_entry` and pass the id above as `supersedes`.',
  );
  return lines.join('\n');
}
