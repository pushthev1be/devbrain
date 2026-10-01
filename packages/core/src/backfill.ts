// Backfill: history the agent never saw, reviewed by the agent.
//
// The Stop hook covers work as it happens. What came before — commits made
// before DevBrain was installed, sessions that ended before the hook existed —
// has nobody to ask in the moment. It used to be handed to a model of
// DevBrain's own. Now it goes to the same writer as everything else: the coding
// agent. `devbrain backfill` prints a bounded batch of unreviewed commits and
// past-session evidence with instructions; the agent reads it, saves what
// matters, and runs it again for the next batch.
//
// Pure: commits and transcripts in, text out. The CLI does git, files and marking.

import type { CommitInfo } from './types';
import { parseTranscript, assessSegment, buildDigest, chunkEvents } from './transcript';
import { ENTRY_GUIDE } from './turnReview';

/** Characters of diff shown per commit; the agent can `git show` for the rest. */
const COMMIT_DIFF_BUDGET = 1800;
/** Characters of session evidence shown per session chunk. */
export const SESSION_CHUNK_BUDGET = 8000;
/** Upper bound on one batch, so it fits comfortably in an agent's context. */
export const BACKFILL_BATCH_BUDGET = 24_000;

/** A commit as the agent should see it: what it said, what it touched, how. */
export function commitExcerpt(c: CommitInfo, budget = COMMIT_DIFF_BUDGET): string {
  const date = new Date(c.timestamp).toISOString().slice(0, 10);
  const [stat, ...rest] = c.diff.split('\n\n');
  const diff = rest.join('\n\n').trim();
  const shown = diff.length > budget ? `${diff.slice(0, budget)}\n… (truncated — \`git show ${c.hash.slice(0, 10)}\` for the rest)` : diff;
  return [
    `### commit ${c.hash.slice(0, 10)} · ${date}`,
    c.message,
    '',
    stat.trim(),
    ...(shown ? ['', '```diff', shown, '```'] : []),
  ].join('\n');
}

export interface SessionChunk {
  /** Evidence to show, or null when the rest of the session holds nothing worth reading. */
  digest: string | null;
  /** Where the session's cursor moves once this chunk has been handed over. */
  toLine: number;
}

/**
 * The next stretch of a past session worth the agent's attention, read from the
 * session's cursor. Stretches with no fix and no decision are skipped over, so
 * the agent is never handed a session of file reads.
 */
export function nextSessionChunk(jsonl: string, fromLine: number, budget = SESSION_CHUNK_BUDGET): SessionChunk {
  const { events, endLine } = parseTranscript(jsonl, fromLine);
  const chunks = chunkEvents(events, budget);
  for (const [i, chunk] of chunks.entries()) {
    const assessment = assessSegment(chunk);
    // Already recorded by the agent at the time: nothing to hand over again.
    if (!assessment.worth || chunk.some(e => e.kind === 'save')) continue;
    return { digest: buildDigest(chunk, budget), toLine: chunks[i + 1]?.[0]?.line ?? endLine };
  }
  return { digest: null, toLine: endLine };
}

export interface BackfillBatch {
  project: string;
  commits: CommitInfo[];
  sessions: { sessionId: string; digest: string }[];
  /** Still unreviewed after this batch. */
  remainingCommits: number;
  remainingSessions: number;
  /** False for a human preview: nothing was marked, so do not say it was. */
  markedReviewed: boolean;
}

export function formatBackfillBatch(b: BackfillBatch): string {
  const out: string[] = [
    `# DevBrain backfill — ${b.project}`,
    '',
    'Below is past work in this repo that has not been reviewed for knowledge yet:',
    `${b.commits.length} commit${b.commits.length === 1 ? '' : 's'} and ${b.sessions.length} stretch${b.sessions.length === 1 ? '' : 'es'} of earlier agent sessions.`,
    'Read it and record what a developer facing the same situation months from now would want to know —',
    'bugs and their real causes, decisions and the alternatives rejected, things that looked right and were not.',
    'Most commits hold nothing like that: skip version bumps, renames, formatting, routine features.',
    '',
    'For each item worth keeping, call the DevBrain `save_entry` tool',
    ...ENTRY_GUIDE,
    '',
    b.markedReviewed
      ? 'Everything below is now marked reviewed, so it will not be shown again.'
      : 'Preview only — nothing below has been marked reviewed.',
  ];

  if (b.commits.length) {
    out.push('', '## Commits', '');
    for (const c of b.commits) out.push(commitExcerpt(c), '');
  }
  if (b.sessions.length) {
    out.push('', '## Earlier agent sessions', '',
      'USER is what the developer said, AGENT what the agent concluded, ERROR failing output, EDITED a changed file.', '');
    for (const s of b.sessions) out.push(`### session ${s.sessionId.slice(0, 8)}`, '', s.digest, '');
  }

  const left = b.remainingCommits + b.remainingSessions;
  out.push('---', left
    ? `Still unreviewed: ${b.remainingCommits} commit${b.remainingCommits === 1 ? '' : 's'} and ${b.remainingSessions} session${b.remainingSessions === 1 ? '' : 's'}. ` +
      'After saving from this batch, run `devbrain backfill` again for the next one.'
    : 'That was everything — history is fully reviewed.');
  return out.join('\n');
}
