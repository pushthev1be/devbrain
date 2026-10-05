// Duplicate detection, shared by every path that writes an entry.
//
// This lived only in the CLI, so the hook and backfill checked for duplicates
// while agent saves (save_entry, task_end) and dashboard saves did not — and the
// agent path is the one used most. A problem worked across several commits or
// several tool calls then left one near-identical entry per call, which is how
// two "@google/adk dependency" entries appeared for a single event.
//
// One implementation here; callers pass their own threshold rather than keeping
// their own copy of the logic.

import { getAllEntriesWithProjects } from './db';
import { findSimilar, keywordTerms } from './search';
import type { Entry, Project } from './types';

/**
 * A human is present to judge in the interactive save path, so it can afford a
 * looser threshold and simply ask. Automatic paths have nobody to ask: a false
 * duplicate costs one skipped entry, a false unique costs permanent noise in
 * every future context load. Hence the stricter default.
 */
export const AUTO_DUPLICATE_THRESHOLD = 0.90;
export const INTERACTIVE_DUPLICATE_THRESHOLD = 0.86;

export interface DuplicateHit {
  entry: Entry & { project: Project };
  similarity: number;
}

/**
 * The closest existing entry in this project above `threshold`, or null.
 *
 * Superseded entries are ignored — knowledge that was explicitly retired should
 * not block a fresh observation of the same area.
 */
export async function findDuplicate(
  embedding: number[],
  projectId: string,
  threshold: number = AUTO_DUPLICATE_THRESHOLD,
): Promise<DuplicateHit | null> {
  if (!embedding?.length) return null;
  const existing = (await getAllEntriesWithProjects())
    .filter(e => e.projectId === projectId && !e.supersededBy);
  const [hit] = findSimilar(embedding, existing, 1, threshold);
  return hit ? { entry: hit.entry as Entry & { project: Project }, similarity: hit.similarity } : null;
}

/** Share of content words two titles have in common (Jaccard), 0..1. */
export function titleOverlap(a: string, b: string): number {
  const x = new Set(keywordTerms(a));
  const y = new Set(keywordTerms(b));
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const w of x) if (y.has(w)) shared++;
  return shared / (x.size + y.size - shared);
}

/** Titles this close are the same knowledge restated. Strict, like the auto threshold. */
export const TEXT_DUPLICATE_THRESHOLD = 0.75;

/**
 * Duplicate check for a save with no embedding — no AI configured. Compares
 * titles, which agents write to be the searchable statement of the entry.
 */
export async function findTextDuplicate(
  title: string,
  projectId: string,
  threshold: number = TEXT_DUPLICATE_THRESHOLD,
): Promise<DuplicateHit | null> {
  const existing = (await getAllEntriesWithProjects())
    .filter(e => e.projectId === projectId && !e.supersededBy);
  let best: DuplicateHit | null = null;
  for (const e of existing) {
    const similarity = titleOverlap(title, e.title);
    if (similarity >= threshold && (!best || similarity > best.similarity)) best = { entry: e, similarity };
  }
  return best;
}

/**
 * Convenience wrapper for callers that only need a yes/no.
 * Never throws: a failing duplicate check must not block a save.
 */
export async function isDuplicateEntry(
  embedding: number[],
  projectId: string,
  threshold: number = AUTO_DUPLICATE_THRESHOLD,
): Promise<boolean> {
  try {
    return (await findDuplicate(embedding, projectId, threshold)) !== null;
  } catch {
    return false;
  }
}
