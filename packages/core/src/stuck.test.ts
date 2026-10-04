/**
 * Tests for noticing a loop.
 *
 * The dangerous failure here is not missing a loop — it is firing on ordinary
 * debugging. An interruption that arrives during normal work gets routed around
 * within a session or two, and then it is worthless when the agent is genuinely
 * stuck. So most of these check that it stays quiet.
 */

import { describe, it, expect } from 'vitest';
import { detectStuck, formatStepBack, errorFingerprint } from './stuck';
import { reviewTurn } from './turnReview';
import type { DigestEvent } from './transcript';

const err = (text: string, via?: string): DigestEvent => ({ kind: 'error', text, ...(via ? { via } : {}) });
const edit = (file: string): DigestEvent => ({ kind: 'edit', text: file });
const say = (text = 'working on it'): DigestEvent => ({ kind: 'say', text });

const TS = "src/a.ts(3,1): error TS2304: Cannot find name 'tier'.";

describe('errorFingerprint', () => {
  it('sees one error where line numbers and paths differ', () => {
    expect(errorFingerprint("C:/repo/src/a.ts(3,1): error TS2304: Cannot find name 'tier'."))
      .toBe(errorFingerprint("C:/repo/src/b.ts(91,7): error TS2304: Cannot find name 'tier'."));
  });

  it('keeps genuinely different errors apart', () => {
    expect(errorFingerprint('TypeError: x is not a function'))
      .not.toBe(errorFingerprint('ReferenceError: tier is not defined'));
  });

  it('ignores ports, hashes and timestamps', () => {
    expect(errorFingerprint('listen EADDRINUSE: address already in use :::8080'))
      .toBe(errorFingerprint('listen EADDRINUSE: address already in use :::3000'));
  });
});

describe('detectStuck — staying quiet', () => {
  it('says nothing about ordinary debugging', () => {
    // An error, a fix, a different error. That is progress.
    expect(detectStuck([err('TypeError: x'), edit('a.ts'), err('ReferenceError: y'), edit('b.ts')])).toEqual([]);
  });

  it('says nothing when a command fails twice', () => {
    expect(detectStuck([err(TS, 'npm run build'), edit('a.ts'), err(TS, 'npm run build')])).toEqual([]);
  });

  it('says nothing about many edits when nothing is failing', () => {
    // Iterating on a file is normal work, not thrashing.
    expect(detectStuck([edit('a.ts'), edit('a.ts'), edit('a.ts'), edit('a.ts'), edit('a.ts')])).toEqual([]);
  });

  it('does not raise the same loop twice in a session', () => {
    const events = [err(TS), edit('a.ts'), err(TS), edit('a.ts'), err(TS)];
    const [first] = detectStuck(events);
    expect(detectStuck(events, { warned: [first.fingerprint] }).some(s => s.fingerprint === first.fingerprint))
      .toBe(false);
  });
});

describe('detectStuck — speaking up', () => {
  it('catches the same error coming back three times', () => {
    const signals = detectStuck([err(TS), edit('a.ts'), err(TS), edit('a.ts'), err(TS)]);
    const repeated = signals.find(s => s.kind === 'repeated-failure')!;
    expect(repeated.count).toBe(3);
    expect(repeated.subject).toContain('TS2304');
  });

  it('catches it even when the line numbers move', () => {
    const signals = detectStuck([
      err('src/a.ts(3,1): error TS2304: Cannot find name x.'),
      err('src/a.ts(40,9): error TS2304: Cannot find name x.'),
      err('src/b.ts(7,2): error TS2304: Cannot find name x.'),
    ]);
    expect(signals.some(s => s.kind === 'repeated-failure')).toBe(true);
  });

  it('catches one command failing over and over', () => {
    const signals = detectStuck([
      err('boom one', 'npm run build'), err('boom two', 'npm run build'), err('boom three', 'npm run build'),
    ]);
    const retry = signals.find(s => s.kind === 'retry-loop')!;
    expect(retry.subject).toBe('npm run build');
    expect(retry.count).toBe(3);
  });

  it('catches one file rewritten while the errors keep coming', () => {
    const signals = detectStuck([
      err('a'), edit('src/x.ts'), err('b'), edit('src/x.ts'), edit('src/x.ts'), edit('src/x.ts'),
    ]);
    expect(signals.find(s => s.kind === 'thrashing')?.subject).toBe('src/x.ts');
  });

  it('puts the most repeated signal first', () => {
    const signals = detectStuck([
      err(TS, 'npm run build'), err(TS, 'npm run build'), err(TS, 'npm run build'), err(TS, 'npm run build'),
    ]);
    expect(signals[0].count).toBeGreaterThanOrEqual(signals[signals.length - 1].count);
  });
});

describe('formatStepBack', () => {
  const signals = detectStuck([err(TS), edit('a.ts'), err(TS), edit('a.ts'), err(TS)]);

  it('names what is repeating rather than just saying "stuck"', () => {
    const text = formatStepBack(signals)!;
    expect(text).toContain('3 times');
    expect(text).toContain('TS2304');
  });

  it('asks for a different approach, not a more careful retry', () => {
    const text = formatStepBack(signals)!;
    expect(text).toContain('you have not actually verified');
    expect(text).toContain('different in kind');
    expect(text).toContain('Repeating the last attempt more carefully is the one option to rule out.');
  });

  it('includes what memory holds about it when there is any', () => {
    const text = formatStepBack(signals, ['[fix] Gate removal left a dangling tier reference (id: e1)'])!;
    expect(text).toContain('DevBrain has seen this before');
    expect(text).toContain('id: e1');
  });

  it('is nothing when nothing is repeating', () => {
    expect(formatStepBack([])).toBeNull();
  });
});

describe('reviewTurn integration', () => {
  let n = 0;
  const tool = (name: string, input: Record<string, unknown>, out: string, isError = false): string => {
    const id = `t${++n}`;
    return [
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } }),
      JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: out, is_error: isError }] } }),
    ].join('\n');
  };
  const fail = () => tool('Bash', { command: 'npm run build' }, TS, true);
  const fix = () => tool('Edit', { file_path: 'src/a.ts' }, 'ok');

  it('interrupts a loop instead of waiting the error out', () => {
    // Without the stuck check this holds forever: an unresolved error is
    // exactly what a loop looks like from here.
    const jsonl = [fail(), fix(), fail(), fix(), fail()].join('\n') + '\n';
    const review = reviewTurn(jsonl, 0);
    expect(review.action).toBe('step-back');
    expect(review.prompt).toContain('step back');
    expect(review.signals!.length).toBeGreaterThan(0);
  });

  it('leaves the cursor where it was, so the episode is still written up after', () => {
    const jsonl = [fail(), fix(), fail(), fix(), fail()].join('\n') + '\n';
    expect(reviewTurn(jsonl, 0).cursor).toBe(0);
  });

  it('goes back to normal once the loop has been named', () => {
    const jsonl = [fail(), fix(), fail(), fix(), fail()].join('\n') + '\n';
    const { signals } = reviewTurn(jsonl, 0);
    const again = reviewTurn(jsonl, 0, { warned: signals!.map(s => s.fingerprint) });
    expect(again.action).not.toBe('step-back');
  });

  it('does not interrupt a normal debug-and-fix turn', () => {
    const jsonl = [fail(), fix(), tool('Bash', { command: 'npm run build' }, 'Build succeeded')].join('\n') + '\n';
    expect(reviewTurn(jsonl, 0).action).not.toBe('step-back');
  });
});
