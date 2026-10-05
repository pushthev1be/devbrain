/**
 * Tests for the per-session state files.
 *
 * The active-session map is the only way a save knows which session it belongs
 * to: the MCP tool and the CLI are never told the session id, only the hooks
 * are. If this returns a stale id, entries get stamped with a session that
 * ended yesterday and the progression view stitches unrelated work together —
 * so the TTL and the "nothing recorded" case are what matter here.
 *
 * homedir() is mocked so each test gets an isolated ~/.devbrain.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

vi.mock('os', async importOriginal => {
  const actual = await importOriginal<typeof import('os')>();
  return { ...actual, homedir: () => process.env.__DEVBRAIN_TEST_HOME as string };
});

import { markActiveSession, activeSession, readCursor, writeCursor, markWarned, markSurfaced } from './sessionCursor';

let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'devbrain-cursor-'));
  process.env.__DEVBRAIN_TEST_HOME = home;
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
  delete process.env.__DEVBRAIN_TEST_HOME;
});

describe('the active session map', () => {
  it('gives back the session recorded for a project', () => {
    markActiveSession('/repo/a', 'sess-1');
    expect(activeSession('/repo/a')).toBe('sess-1');
  });

  it('keeps projects apart, so two repos in parallel do not cross', () => {
    markActiveSession('/repo/a', 'sess-a');
    markActiveSession('/repo/b', 'sess-b');
    expect(activeSession('/repo/a')).toBe('sess-a');
    expect(activeSession('/repo/b')).toBe('sess-b');
  });

  it('lets the later session win in one repo', () => {
    markActiveSession('/repo/a', 'first');
    markActiveSession('/repo/a', 'second');
    expect(activeSession('/repo/a')).toBe('second');
  });

  it('returns nothing for a project never seen', () => {
    markActiveSession('/repo/a', 'sess-1');
    expect(activeSession('/repo/other')).toBeUndefined();
  });

  it('returns nothing before anything has been recorded at all', () => {
    expect(activeSession('/repo/a')).toBeUndefined();
  });

  // An entry stamped with yesterday's session is worse than one with no session
  // at all: the graph would draw an edge between two unrelated episodes.
  it('forgets a session older than the TTL rather than guessing', () => {
    const dir = join(home, '.devbrain', 'sessions');
    mkdirSync(dir, { recursive: true });
    const old = Date.now() - 13 * 60 * 60 * 1000;
    writeFileSync(join(dir, 'active.json'), JSON.stringify({ '/repo/a': { sessionId: 'stale', at: old } }));
    expect(activeSession('/repo/a')).toBeUndefined();
  });

  it('still trusts a session from a few hours ago — a long day is one session', () => {
    const dir = join(home, '.devbrain', 'sessions');
    mkdirSync(dir, { recursive: true });
    const earlier = Date.now() - 6 * 60 * 60 * 1000;
    writeFileSync(join(dir, 'active.json'), JSON.stringify({ '/repo/a': { sessionId: 'live', at: earlier } }));
    expect(activeSession('/repo/a')).toBe('live');
  });

  it('survives a corrupt file instead of taking the hook down with it', () => {
    const dir = join(home, '.devbrain', 'sessions');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'active.json'), '{not json');
    expect(activeSession('/repo/a')).toBeUndefined();
    expect(() => markActiveSession('/repo/a', 's1')).not.toThrow();
    expect(activeSession('/repo/a')).toBe('s1');
  });

  it('ignores an empty project path or session id', () => {
    markActiveSession('', 's1');
    markActiveSession('/repo/a', '');
    expect(activeSession('/repo/a')).toBeUndefined();
  });
});

describe('cursor state', () => {
  // This is the regression: patchState merging onto the normalised view erased
  // `warned`, so the step-back interruption fired again every single turn.
  it('keeps warned and surfaced when the cursor line moves', () => {
    markWarned('s1', ['fp-1']);
    markSurfaced('s1', ['e-1']);
    writeCursor('s1', 42);
    const state = readCursor('s1');
    expect(state.line).toBe(42);
    expect(state.warned).toEqual(['fp-1']);
    expect(state.surfaced).toEqual(['e-1']);
  });

  it('starts at zero for a session it has never seen', () => {
    expect(readCursor('unknown').line).toBe(0);
  });
});
