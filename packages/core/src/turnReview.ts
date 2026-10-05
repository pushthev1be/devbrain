// Agent-authored capture: DevBrain notices, the coding agent writes.
//
// The agent that did the work already holds the whole session in context — the
// error, the dead ends, the reason the fix works. It can state that knowledge
// better than any second model reading the transcript afterwards, and asking it
// costs no extra AI service: DevBrain needs no model of its own to capture.
//
// What agents lacked was a reliable trigger. Instructions to "save when you
// learn something" are followed unevenly, and every miss is silent. So the
// trigger is mechanical: after each turn, the harness's Stop hook runs this
// over the new part of the transcript. When the turn worked something out and
// the agent recorded nothing, the hook holds the agent for one more step and
// hands it the evidence, and the agent writes the entry with save_entry.
//
// Pure: transcript text in, decision out. No I/O, no model.

import { parseTranscript, assessSegment } from './transcript';
import { detectStuck, formatStepBack, episodeFingerprints } from './stuck';
import type { StuckSignal } from './stuck';
import type { DigestEvent } from './transcript';

export type TurnAction =
  /** Ask the agent to record what this stretch established. */
  | 'ask'
  /** Interrupt: the work is going in circles rather than progressing. */
  | 'step-back'
  /** The agent already recorded something here; nothing to ask. */
  | 'recorded'
  /** Nothing yet — keep reading, so this stretch is judged with what follows. */
  | 'hold';

export interface TurnReview {
  action: TurnAction;
  /** Line the cursor should move to. Unchanged on `hold`. */
  cursor: number;
  /** For `ask` and `step-back`: the message shown to the agent. */
  prompt?: string;
  /** For `step-back`: what is repeating, so the caller can look it up. */
  signals?: StuckSignal[];
  /** For `step-back`: every fingerprint of this episode, to mark as already raised. */
  suppress?: string[];
}

/** Past this, a stretch is judged now rather than accumulated further. */
const MAX_HELD_EVENTS = 600;

/**
 * How far back a loop is looked for, in transcript lines.
 *
 * Bounded so a long session does not re-read itself every turn, and short
 * enough that a loop resolved an hour ago does not keep counting against the
 * agent now.
 */
const STUCK_WINDOW_LINES = 400;

function recentFrom(jsonl: string): number {
  return Math.max(0, jsonl.split('\n').length - STUCK_WINDOW_LINES);
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function shortPath(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts.slice(-2).join('/');
}

/** The message that asks the agent to record this stretch, built from its evidence. */
export function buildRecordPrompt(events: DigestEvent[]): string {
  const errors = unique(events.filter(e => e.kind === 'error').map(e => e.text.split('\n')[0].trim()))
    .filter(Boolean).slice(-3);
  const files = unique(events.filter(e => e.kind === 'edit').map(e => shortPath(e.text))).slice(-6);

  // The exact string is handed over, not described. DevBrain already has it,
  // and asking the agent to retype an error it read minutes ago is how entries
  // ended up without one: on a real project only 3 of 130 carried a pattern,
  // and an entry without one can never be matched to a future failure.
  const evidence: string[] = [];
  for (const err of errors) evidence.push(`- error seen — use this verbatim as error_pattern:\n    ${err.length > 200 ? `${err.slice(0, 200)}` : err}`);
  if (files.length) evidence.push(`- files changed: ${files.join(', ')}`);

  return [
    'DevBrain: this stretch of work looks like it established something worth remembering, and nothing was saved for it yet.',
    ...(evidence.length ? ['', ...evidence] : []),
    '',
    'You did the work, so you write the record — DevBrain only stores it. For each distinct, non-obvious item',
    '(usually one, at most three), call the DevBrain `save_entry` tool',
    ...ENTRY_GUIDE,
    '',
    'If it was routine (a typo, an obvious change) or DevBrain already has it, save nothing.',
    'Either way, keep it brief: one short line to the user, then stop.',
  ].join('\n');
}

/**
 * How to write an entry. Shared by every place DevBrain asks an agent to record
 * something, so the Stop hook and backfill hold entries to the same bar.
 */
export const ENTRY_GUIDE: readonly string[] = [
  '(or, if the tool is not available, `devbrain note "fix: <title> — <cause and fix>" --error "<exact error>"`',
  ' — the --error flag matters, because without it the CLI stores no pattern at all):',
  '- type: fix, bug, decision, lesson, anti-pattern, pattern or stack',
  '- title: the symptom or the decision, searchable, under 90 characters. Not "Fixed X" or "Updated Y".',
  '- content: the root cause, then the exact fix — or for a decision, what was chosen, what was rejected, and why',
  '- error_pattern: the exact error text, copied verbatim, whenever there was one. This is the',
  '  field that lets a future failure find the entry — an entry without one can only be found',
  '  by someone already searching for it. Copy any error quoted above exactly, character for character.',
];

/**
 * Decide what to do after the agent's turn, given the transcript and the line
 * up to which it has already been reviewed.
 */
export function reviewTurn(jsonl: string, fromLine: number, opts: { warned?: readonly string[] } = {}): TurnReview {
  const segment = parseTranscript(jsonl, fromLine);
  const { events, endLine } = segment;
  if (endLine <= fromLine || events.length === 0) return { action: 'hold', cursor: fromLine };

  // Being stuck is checked first, and before the unresolved-error hold below,
  // because the two look identical from here: an error outstanding and edits
  // still coming. Held instead of raised, a loop would be waited out in silence
  // for exactly as long as it kept failing.
  //
  // It reads a window of recent history rather than the unreviewed segment,
  // because the two answer different questions. The cursor tracks what has been
  // asked about, and it advances every time the agent is asked to record
  // something — so a loop spread over three turns would be examined one failure
  // at a time and never look like repetition at all.
  const recent = parseTranscript(jsonl, recentFrom(jsonl)).events;
  const signals = detectStuck(recent, { warned: opts.warned });
  if (signals.length) {
    // The cursor does not move: this stretch has still established nothing to
    // record, and once the agent gets unstuck it should be asked to write up
    // the whole episode, not just the part after the interruption.
    return {
      action: 'step-back', cursor: fromLine, prompt: formatStepBack(signals)!, signals,
      suppress: episodeFingerprints(recent),
    };
  }

  // The agent saved on its own during this stretch. It chose what mattered;
  // asking again would only produce a duplicate.
  if (events.some(e => e.kind === 'save')) return { action: 'recorded', cursor: endLine };

  const assessment = assessSegment(events);
  const tooLong = events.length > MAX_HELD_EVENTS;

  // A fix not made yet cannot be recorded yet. Ask once it lands.
  if (assessment.unresolved && !tooLong) return { action: 'hold', cursor: fromLine };
  if (!assessment.worth) {
    // Hold quiet stretches so a question now is judged with the bug it leads
    // to later — but not forever, or an old stretch would be re-read each turn.
    return tooLong ? { action: 'hold', cursor: endLine } : { action: 'hold', cursor: fromLine };
  }
  return { action: 'ask', cursor: endLine, prompt: buildRecordPrompt(events) };
}
