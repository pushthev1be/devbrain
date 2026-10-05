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

/**
 * How close in meaning an entry must be to be volunteered when the wording
 * does not match.
 *
 * Set to the same bar a deliberate search uses, not higher, because the
 * precision here comes from somewhere else: only the top two of an already
 * ranked list are offered, and that ranking folds in lexical overlap, category
 * and project. Measured over 176 live entries against eleven hand-written
 * failures — five with a right answer, six with none — this found 4 of the 5
 * and fired on 0 of the 6. Raising it to 0.66 found 3, and to 0.70 found 2,
 * with no precision to gain in return.
 */
export const VOLUNTEER_MIN_SEMANTIC = 0.62;

/** Most entries to volunteer at once. Two is a hint; five is an interruption. */
export const VOLUNTEER_TOP_K = 2;

export interface RecallOptions {
  projectId?: string;
  /** Entry ids already surfaced this session — never repeated. */
  exclude?: readonly string[];
  topK?: number;
  minPattern?: number;
  /**
   * The failure text, embedded. Optional, and everything still works without
   * it: with no embedding only literal matches can be found, which is the
   * behaviour this had before and the behaviour offline.
   */
  embedding?: number[];
  minSemantic?: number;
}

/**
 * Entries worth putting in front of an agent for this failure, best first.
 *
 * Two routes in, because they fail in opposite directions.
 *
 * Literal — the failure text overlaps a stored error pattern or title. This is
 * the strongest claim available ("this exact thing happened before") and it is
 * never wrong, but it only fires when the failure arrives worded the way it was
 * written down. Measured against five failures phrased the way a tool or a
 * person actually emits them, rather than quoting the entry, it found none of
 * them: real stack traces do not quote entry titles, and only 10 of 52 entries
 * here carry an error pattern at all.
 *
 * Semantic — close in meaning, when an embedding is available. This is what
 * reaches the other 80 percent of the store. On the same five it found four,
 * and on six unrelated failures it offered nothing.
 *
 * Both are capped at topK and both draw from one ranked list, so a literal hit
 * still outranks a merely similar one.
 */
export function recallForFailure(
  failure: string,
  all: (Entry & { project: Project })[],
  opts: RecallOptions = {},
): PreciseSearchResult[] {
  const {
    projectId, exclude = [], topK = VOLUNTEER_TOP_K,
    minPattern = VOLUNTEER_MIN_PATTERN,
    embedding = [], minSemantic = VOLUNTEER_MIN_SEMANTIC,
  } = opts;
  if (!failure.trim()) return [];

  const skip = new Set(exclude);
  const candidates = all.filter(e => !skip.has(e.id) && !e.supersededBy);

  // With no embedding preciseSearch scores literal overlap only, which is what
  // an exact error string wants anyway — and is all there is to go on offline.
  return preciseSearch(failure, embedding, candidates, { projectId, topK: topK * 4 })
    .filter(r =>
      (r.matchType === 'pattern' && r.patternScore >= minPattern) ||
      (embedding.length > 0 && r.similarity >= minSemantic))
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
