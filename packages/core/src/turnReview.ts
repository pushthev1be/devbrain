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

import { parseTranscript, assessSegment, isGenericFailureLine } from './transcript';
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
  /**
   * For `ask`: the evidence `prompt` was built from.
   *
   * Returned so a caller that can reach the database — which this function
   * deliberately cannot — can rebuild the prompt with links only it knows
   * about, without having to re-derive which events mattered.
   */
  events?: DigestEvent[];
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
export function buildRecordPrompt(
  events: DigestEvent[],
  openBugs: { id: string; title: string }[] = [],
): string {
  // A generic line is offered to nobody as an error_pattern. "Exit code 1" is
  // true of every failure, so stored as a pattern it would match all of them —
  // and the prompt asks for it to be copied verbatim, so offering it is how a
  // pattern that poisons every future query gets written down.
  const errors = unique(events.filter(e => e.kind === 'error').map(e => e.text.split('\n')[0].trim()))
    .filter(line => line && !isGenericFailureLine(line)).slice(-3);
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
    ...buildNoErrorHint(events),
    ...buildFixHint(openBugs),
    '',
    'If it was routine (a typo, an obvious change) or DevBrain already has it, save nothing.',
    'Either way, keep it brief: one short line to the user, then stop.',
  ].join('\n');
}

/**
 * What to ask for when the stretch contains no error at all.
 *
 * The ask itself was fix-shaped. It leads with error lines to copy verbatim and
 * the files changed, and `ENTRY_GUIDE` opens with "the root cause, then the
 * exact fix". An agent reading that writes a fix, or writes nothing — and the
 * type distribution shows it: of 224 entries, 88 are `fix` and 11 are
 * `decision`.
 *
 * It is not that decisions go undetected. Measured over 52 chunks of real
 * transcript, 20 of the 37 stretches that trigger the ask reach it through the
 * two decision-shaped paths in `assessSegment` rather than the error-and-edit
 * one. The trigger fires; the prompt then asks the wrong question.
 *
 * Keyed off `errors === 0`, which is a fact about the stretch, not a guess about
 * its prose. An earlier attempt matched decision vocabulary and quoted the
 * sentence back — the same trick that made `error_pattern` get filled in. It was
 * abandoned because it could not be made precise: at chunk scale the loose form
 * fired on 92% of nudges, and the tightened form still quoted "All eight saved,
 * none rejected as duplicates" and "the headline number to be skeptical of is
 * 83% vs 60%" as though they were choices. A hint that quotes the wrong sentence
 * is worse than none: it teaches the agent the hint is noise, and it invites an
 * entry about a decision nobody made.
 */
export function buildNoErrorHint(events: DigestEvent[]): string[] {
  if (events.some(e => e.kind === 'error')) return [];
  const edited = events.some(e => e.kind === 'edit');

  return [
    '',
    edited
      ? 'Nothing failed in this stretch, so there is no root cause to write and no error to quote.'
      : 'No code changed and nothing failed in this stretch, so there is nothing here to write up as a fix.',
    'If something is worth keeping it is one of these, and each needs a different thing from you:',
    '- `decision` — what you chose, **what you turned down, and why**. The rejected option is the',
    '  part that cannot be recovered later: without it the entry cannot be re-judged when the',
    '  trade-off changes, and it reads as though nothing else was considered.',
    '- `lesson` — what looked true and was not, and what is actually true.',
    '- `pattern` / `anti-pattern` — the shape worth repeating, or the one to stop reaching for.',
    'Leave `error_pattern` off entirely. There was no error, and a plausible-looking one invented',
    'here would match every future failure of that shape and identify none of them.',
    'If the choice was obvious, or forced, or already recorded, save nothing — this is the case',
    'where saving nothing is the common answer.',
  ];
}

/**
 * Named when this stretch resolved something already recorded.
 *
 * A field nobody is prompted for stays empty — error_pattern sat on 3 of 130
 * entries for exactly that reason. So the open bugs this session recorded are
 * put in front of the agent at the moment it is writing the fix.
 */
export function buildFixHint(openBugs: { id: string; title: string }[]): string[] {
  if (!openBugs.length) return [];
  return [
    '',
    'You recorded these earlier this session and nothing has closed them yet.',
    'If this stretch fixed one, pass its id as `fixes` — both entries stay, linked:',
    ...openBugs.slice(0, 3).map(b => `  ${b.id}  ${b.title.slice(0, 70)}`),
  ];
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
export function reviewTurn(
  jsonl: string,
  fromLine: number,
  opts: { warned?: readonly string[] } = {},
): TurnReview {
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
  return { action: 'ask', cursor: endLine, prompt: buildRecordPrompt(events), events };
}
