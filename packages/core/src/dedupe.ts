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
import { findSimilar } from './search';
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
