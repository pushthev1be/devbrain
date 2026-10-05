// Noticing when an agent is going in circles, and making it stop and think.
//
// An agent that is stuck does not feel stuck. It has a plausible next thing to
// try at every step, so it keeps trying variations of the same thing — the
// documented failure mode behind "my agent ran for six hours on a two-minute
// task". The literature calls the remedy a circuit breaker, and it agrees on
// two points: the trigger is repetition rather than elapsed time, and the
// response has to force a change of approach, because an agent told only that
// it is stuck will try the same thing more carefully.
//
// DevBrain can do better than a generic breaker because it already reads the
// transcript and already holds what went wrong here before. The caller supplies
// anything memory knows about the error; this module decides whether to speak.
//
// Pure: events in, signals out. No I/O, no model.

import type { DigestEvent } from './transcript';

export type StuckKind =
  /** The same error, by fingerprint, keeps coming back. */
  | 'repeated-failure'
  /** The same file edited over and over while the error does not move. */
  | 'thrashing'
  /** The same command re-run and failing each time. */
  | 'retry-loop';

export interface StuckSignal {
  kind: StuckKind;
  /** What is repeating, in words, for the prompt. */
  subject: string;
  count: number;
  /** Stable id for this signal, so the same one is not raised twice a session. */
  fingerprint: string;
}

export interface StuckOptions {
  /** Identical failures before it counts as repeated. Three is the common budget. */
  failureLimit?: number;
  /** Edits to one file before it counts as thrashing. */
  editLimit?: number;
  /** Signal fingerprints already raised this session. */
  warned?: readonly string[];
}

const DEFAULTS = { failureLimit: 3, editLimit: 4 };

/**
 * Reduce an error to what makes it *that* error.
 *
 * Line numbers, paths, ports, hashes and timestamps all move between runs of
 * the same failure, so comparing raw text would see three distinct errors where
 * a person sees one. Stripping them is what makes repetition visible.
 */
export function errorFingerprint(text: string): string {
  return String(text)
    .toLowerCase()
    .split('\n')[0]
    .replace(/[a-z]:[\\/][^\s:]+/g, '<path>')       // windows absolute paths
    .replace(/[\w.-]+[\\/][\w.\\/-]+/g, '<path>')   // any path with a separator, relative included
    .replace(/\b[\w-]+\.[a-z0-9]{1,4}\b/g, '<file>')// a bare filename: the same error in another file
    .replace(/\b0x[0-9a-f]+\b/g, '<hex>')
    .replace(/\b\d[\d.:-]*\b/g, '<n>')              // line:col, ports, versions, dates
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

/** Normalise a command so `npm test -- -t x` and `npm test` are not confused. */
function commandFingerprint(command: string): string {
  return command.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);
}

/** The tail of a path: an absolute Windows path reads as noise in a one-line warning. */
function shortPath(path: string): string {
  return path.replace(/\\/g, '/').split('/').slice(-2).join('/');
}

function tally<T>(items: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
}

/**
 * Signals that this stretch of work is going in circles, strongest first.
 *
 * Returns nothing for ordinary debugging — an error, an edit, a different
 * error — because that is progress, and interrupting it would make the warning
 * worthless when it matters.
 */
export function detectStuck(events: DigestEvent[], opts: StuckOptions = {}): StuckSignal[] {
  const failureLimit = opts.failureLimit ?? DEFAULTS.failureLimit;
  const editLimit = opts.editLimit ?? DEFAULTS.editLimit;
  const warned = new Set(opts.warned ?? []);

  const errors = events.filter(e => e.kind === 'error');
  const edits = events.filter(e => e.kind === 'edit');
  const signals: StuckSignal[] = [];

  // The same error coming back, however the agent reworded the attempt.
  for (const [print, count] of tally(errors.map(e => errorFingerprint(e.text)))) {
    if (count < failureLimit) continue;
    const example = errors.find(e => errorFingerprint(e.text) === print)!;
    signals.push({
      kind: 'repeated-failure',
      subject: example.text.split('\n')[0].slice(0, 160),
      count,
      fingerprint: 'err:' + print,
    });
  }

  // The same command failing again and again. Counted from the commands that
  // produced an error, so a command re-run successfully is not a loop.
  for (const [cmd, count] of tally(errors.map(e => e.via).filter((c): c is string => !!c).map(commandFingerprint))) {
    if (count < failureLimit) continue;
    signals.push({ kind: 'retry-loop', subject: cmd, count, fingerprint: 'cmd:' + cmd });
  }

  // One file rewritten repeatedly, but only while the *same* error keeps coming
  // back. Thrashing is not a signal on its own: editing a file many times while
  // different errors appear and get fixed is what productive work looks like,
  // and gating only on "some errors happened" fired on exactly that — 30 edits
  // across a busy window with six unrelated, already-resolved errors in it.
  // Without a recurring failure there is no evidence the edits are not working.
  if (signals.some(s => s.kind === 'repeated-failure')) {
    for (const [file, count] of tally(edits.map(e => e.text))) {
      if (count < editLimit) continue;
      signals.push({ kind: 'thrashing', subject: shortPath(file), count, fingerprint: 'file:' + file });
    }
  }

  return signals
    .filter(s => !warned.has(s.fingerprint))
    .sort((a, b) => b.count - a.count);
}

/**
 * Every fingerprint this stretch could raise a signal for later, threshold or
 * no threshold.
 *
 * Marked together when an interruption goes out, because the three kinds are
 * three views of one episode: the error, the command that produced it, and the
 * file being rewritten. Marking only the ones that had already crossed meant
 * the next one crossed a turn later and interrupted again about the same
 * problem — one episode, two interruptions, which is how a warning becomes
 * something to route around.
 */
export function episodeFingerprints(events: DigestEvent[]): string[] {
  const out = new Set<string>();
  for (const e of events) {
    if (e.kind === 'error') {
      out.add('err:' + errorFingerprint(e.text));
      if (e.via) out.add('cmd:' + commandFingerprint(e.via));
    }
    if (e.kind === 'edit') out.add('file:' + e.text);
  }
  return [...out];
}

/**
 * The interruption itself.
 *
 * Deliberately not "you seem stuck, try again". It names what is repeating,
 * hands over anything memory holds about it, and asks for the two things that
 * actually break a loop: the assumption that has gone unexamined, and an
 * approach different in kind from what has been tried. Then it gets out of the
 * way — the agent decides, the hook does not.
 */
export function formatStepBack(signals: StuckSignal[], related: string[] = []): string | null {
  if (!signals.length) return null;

  const lines: string[] = ['DevBrain: step back for a moment — this looks like a loop, not progress.', ''];

  for (const s of signals.slice(0, 3)) {
    if (s.kind === 'repeated-failure') {
      lines.push(`- the same error has come back ${s.count} times: ${s.subject}`);
    } else if (s.kind === 'retry-loop') {
      lines.push(`- \`${s.subject}\` has failed ${s.count} times`);
    } else {
      lines.push(`- ${s.subject} has been rewritten ${s.count} times and the errors have not stopped`);
    }
  }

  if (related.length) {
    lines.push('', 'DevBrain has seen this before:', ...related.map(r => '  ' + r));
  }

  lines.push(
    '',
    'Before editing anything else, answer these in one or two lines each:',
    '  1. What have you been assuming is true that you have not actually verified?',
    '  2. What would you check to prove it, rather than working around it?',
    '  3. What approach is different in kind from what you have tried — not another variation of it?',
    '',
    'Then either take that approach, or tell the user what you are stuck on and what you need.',
    'Repeating the last attempt more carefully is the one option to rule out.',
  );
  return lines.join('\n');
}
