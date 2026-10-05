/**
 * Tests for lifting a verbatim error out of a CLAUDE.md section.
 *
 * This decides whether an indexed entry can ever be recalled: the failure hook
 * matches a command's output against errorPattern, so a section without one is
 * invisible to the only retrieval that fires unasked. Measured before this
 * existed, 0 of 85 indexed entries on a real project carried a pattern.
 *
 * The risk runs both ways. Missing a real error costs a recall; inventing one
 * out of prose poisons matching for every future query, so shape is required
 * rather than the mere presence of the word "error".
 */

import { describe, it, expect } from 'vitest';
import { extractErrorPattern, entryForSection, parseMarkdownSource } from './indexSource';
import type { Project } from './types';

const project: Project = { id: 'p1', name: 'app', path: '/repo', stack: [], createdAt: 1, lastSeen: 1 };

describe('extractErrorPattern', () => {
  it('takes an explicit Error field first', () => {
    expect(extractErrorPattern('**Error**: `ReferenceError: tier is not defined`\n\nSome prose.'))
      .toBe('ReferenceError: tier is not defined');
  });

  it('finds one inside a fenced block', () => {
    const body = 'The cron died:\n\n```\nnpm ERR! code ELIFECYCLE\nnpm ERR! errno 1\n```\n';
    expect(extractErrorPattern(body)).toBe('npm ERR! code ELIFECYCLE');
  });

  it('finds one in inline code', () => {
    expect(extractErrorPattern('The call returned `{"error":"Forbidden"}` for an anon key.'))
      .toBe('{"error":"Forbidden"}');
  });

  it('recognises a named error mid-sentence', () => {
    expect(extractErrorPattern('Deleting the gate left it throwing TypeError: x is not a function on load.'))
      .toContain('TypeError: x is not a function');
  });

  it('ignores prose that only describes an error', () => {
    expect(extractErrorPattern('It threw a permissions error and the cron stopped.')).toBeUndefined();
    expect(extractErrorPattern('This is the error handling section for the API.')).toBeUndefined();
  });

  it('ignores a template lifted out of source', () => {
    // Nobody can paste this into a search, and it would match everything.
    expect(extractErrorPattern('Logs `Gemini error {errorCode}: {errorMessage}` on failure.')).toBeUndefined();
    expect(extractErrorPattern('throws `Error: ${reason}`')).toBeUndefined();
  });

  it('ignores something too short or too long to be a usable pattern', () => {
    expect(extractErrorPattern('`Err:`')).toBeUndefined();
    expect(extractErrorPattern('`' + 'Error: ' + 'x'.repeat(400) + '`')).toBeUndefined();
  });

  it('returns nothing for a section with no error in it at all', () => {
    expect(extractErrorPattern('We chose Postgres over Mongo for relational joins.')).toBeUndefined();
  });

  it('strips markdown bullets and backticks from what it returns', () => {
    const got = extractErrorPattern('- `MongoServerError: bad auth : authentication failed`');
    expect(got).toBe('MongoServerError: bad auth : authentication failed');
  });
});

describe('entryForSection', () => {
  const index = (md: string) => {
    const [section] = parseMarkdownSource(md);
    return entryForSection(section, project, 'CLAUDE.md', { id: 'e1' });
  };

  it('carries the error onto the indexed entry, so it can be recalled', () => {
    const entry = index([
      '## Critical Bugs Fixed',
      '',
      '### 1. Cron jobs 401 after the gate shipped',
      '',
      'The header had to ship before the checks. Until it did every call returned',
      '`{"error":"Forbidden"}` from the edge function.',
    ].join('\n'));
    expect(entry.errorPattern).toBe('{"error":"Forbidden"}');
    expect(entry.source?.file).toBe('CLAUDE.md');
  });

  it('leaves it unset when the section has no error, rather than inventing one', () => {
    const entry = index([
      '## Decisions',
      '',
      '### Storage',
      '',
      'We chose JSON over SQLite because there is no native compilation on Windows.',
    ].join('\n'));
    expect(entry.errorPattern).toBeUndefined();
  });
});
