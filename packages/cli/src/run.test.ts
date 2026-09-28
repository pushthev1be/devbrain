/**
 * Tests for extractFailure — picking the real error out of a build or test log.
 *
 * `devbrain run` is the one lookup that fires without anyone choosing to: it
 * triggers when a command fails, which is the moment a past fix is worth most.
 * Everything downstream depends on this function picking the right line — embed
 * a banner or a stack frame and the search returns nothing useful.
 */

import { describe, it, expect } from 'vitest';
import { extractFailure } from './index';

describe('extractFailure', () => {
  it('finds the error line in a node stack trace, not the frames', () => {
    const log = [
      '> devbrain@0.1.0 test',
      '> vitest run',
      '',
      'TypeError: Cannot read properties of undefined (reading \'config\')',
      '    at Object.<anonymous> (/repo/src/index.ts:12:5)',
      '    at Module._compile (node:internal/modules/cjs/loader:1234:14)',
    ].join('\n');
    expect(extractFailure(log)).toBe("TypeError: Cannot read properties of undefined (reading 'config')");
  });

  it('finds a TypeScript diagnostic', () => {
    const log = [
      '> tsc',
      "src/index.ts(19,3): error TS2305: Module '\"@devbrain/core\"' has no exported member 'isDuplicateEntry'.",
    ].join('\n');
    expect(extractFailure(log)).toContain('error TS2305');
  });

  it('finds a node errno code', () => {
    const log = 'Error: listen EADDRINUSE: address already in use 0.0.0.0:8080';
    expect(extractFailure(log)).toContain('EADDRINUSE');
  });

  it('finds a mongo authentication failure', () => {
    const log = [
      'connecting...',
      'MongoServerError: bad auth : authentication failed',
    ].join('\n');
    expect(extractFailure(log)).toContain('authentication failed');
  });

  it('prefers the failure over surrounding noise near the end of a log', () => {
    const log = [
      'Test Files  9 passed (9)',
      'ReferenceError: switchTab is not defined',
      'Duration 1.02s',
    ].join('\n');
    expect(extractFailure(log)).toBe('ReferenceError: switchTab is not defined');
  });

  it('strips ANSI colour so the query is clean text', () => {
    const log = '\x1b[31mError: something broke\x1b[0m';
    const out = extractFailure(log)!;
    expect(out).toBe('Error: something broke');
    expect(out).not.toMatch(/\x1b/);
  });

  it('falls back to the last meaningful line when nothing matches a signal', () => {
    expect(extractFailure('step one\nstep two\nstep three')).toBe('step three');
  });

  it('returns null for empty or whitespace-only output', () => {
    expect(extractFailure('')).toBeNull();
    expect(extractFailure('   \n\n  ')).toBeNull();
  });

  it('returns null when the log is only stack frames', () => {
    expect(extractFailure('    at foo (a.js:1:1)\n    at bar (b.js:2:2)')).toBeNull();
  });

  it('caps the query length so one giant line cannot swamp the embedding', () => {
    expect(extractFailure('Error: ' + 'x'.repeat(5000))!.length).toBeLessThanOrEqual(300);
  });

  it('searches the tail, so a later failure wins over an earlier mention', () => {
    const log = [
      'Error: this one was handled and retried',
      ...Array.from({ length: 30 }, (_, i) => `progress line ${i}`),
      'Error: this is the one that actually failed',
    ].join('\n');
    expect(extractFailure(log)).toBe('Error: this is the one that actually failed');
  });
});
