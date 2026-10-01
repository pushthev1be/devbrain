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
import type { DigestEvent } from './transcript';

export type TurnAction =
  /** Ask the agent to record what this stretch established. */
  | 'ask'
  /** The agent already recorded something here; nothing to ask. */
  | 'recorded'
  /** Nothing yet — keep reading, so this stretch is judged with what follows. */
  | 'hold';

export interface TurnReview {
  action: TurnAction;
  /** Line the cursor should move to. Unchanged on `hold`. */
  cursor: number;
  /** For `ask`: the message shown to the agent. */
  prompt?: string;
}

/** Past this, a stretch is judged now rather than accumulated further. */
const MAX_HELD_EVENTS = 600;

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

  const evidence: string[] = [];
  for (const err of errors) evidence.push(`- error seen: ${err.length > 160 ? `${err.slice(0, 160)}…` : err}`);
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
  '(or run `devbrain note "fix: <title> — <cause and fix>"` if the tool is not available):',
  '- type: fix, bug, decision, lesson, anti-pattern, pattern or stack',
  '- title: the symptom or the decision, searchable, under 90 characters. Not "Fixed X" or "Updated Y".',
  '- content: the root cause, then the exact fix — or for a decision, what was chosen, what was rejected, and why',
  '- error_pattern: the exact error text, copied verbatim, whenever there was one',
];

/**
 * Decide what to do after the agent's turn, given the transcript and the line
 * up to which it has already been reviewed.
 */
export function reviewTurn(jsonl: string, fromLine: number): TurnReview {
  const segment = parseTranscript(jsonl, fromLine);
  const { events, endLine } = segment;
  if (endLine <= fromLine || events.length === 0) return { action: 'hold', cursor: fromLine };

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
