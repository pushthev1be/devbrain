// Did any of this memory earn its keep?
//
// The store could always say how much it held. It could not say whether any of
// it ever helped, which made "is DevBrain working" a matter of opinion. The
// numbers that existed did not settle it either: retrievalCount counts every
// surfacing, and the session briefing surfaces entries whether or not they turn
// out to be useful, so a high count can mean nothing happened at all.
//
// One event is different. When a command fails and a stored error pattern
// matches it, that entry was handed over because it was relevant, in the moment
// it was relevant. recallCount counts only that, and it is the number worth
// reporting.
//
// Pure: entries in, counts out.

import type { Entry } from './types';

export interface MemoryUse {
  /** Active entries — retracted ones are not counted as stock. */
  entries: number;
  /** Entries that have caught at least one real failure. */
  earned: number;
  /** Failures caught in total, across all entries. */
  recalls: number;
  /** Entries that have never been surfaced at all, by any path. */
  neverSurfaced: number;
  /** Entries that have been corrected at least once. */
  revised: number;
  /** Corrections made in total. */
  revisions: number;
  /** Entries retracted and replaced. */
  retracted: number;
  /** Share of active entries that have caught a failure, 0..1. */
  earnedShare: number;
}

export function measureUse(entries: Entry[]): MemoryUse {
  const active = entries.filter(e => !e.supersededBy);
  const earned = active.filter(e => (e.recallCount ?? 0) > 0).length;

  return {
    entries: active.length,
    earned,
    recalls: active.reduce((n, e) => n + (e.recallCount ?? 0), 0),
    neverSurfaced: active.filter(e => !(e.retrievalCount ?? 0) && !(e.recallCount ?? 0)).length,
    revised: active.filter(e => (e.revisionCount ?? 0) > 0).length,
    revisions: active.reduce((n, e) => n + (e.revisionCount ?? 0), 0),
    retracted: entries.filter(e => e.supersededBy).length,
    earnedShare: active.length ? earned / active.length : 0,
  };
}

/**
 * The measurement as one line.
 *
 * Says plainly when nothing has been caught yet, rather than printing a 0 that
 * reads like a rounding error. A store nothing has ever recalled from is a
 * diary, and the line should say so while that is true.
 */
export function describeUse(use: MemoryUse): string {
  if (use.entries === 0) return 'Nothing recorded yet.';
  if (use.recalls === 0) {
    return `${use.entries} entries · none has caught a failure yet`;
  }
  const pct = Math.round(use.earnedShare * 100);
  const parts = [
    `${use.entries} entries`,
    `${use.earned} (${pct}%) caught a failure`,
    `${use.recalls} ${use.recalls === 1 ? 'catch' : 'catches'} in total`,
  ];
  if (use.revised > 0) parts.push(`${use.revised} revised`);
  return parts.join(' · ');
}
