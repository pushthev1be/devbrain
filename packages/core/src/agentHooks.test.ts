/**
 * Tests for wiring DevBrain into the agent's lifecycle hooks, and for the
 * per-session cursor those hooks and backfill share.
 *
 * Installing hooks must never disturb the user's other hooks, must be
 * idempotent, and must clean up events an earlier version installed.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

vi.mock('os', async importOriginal => {
  const actual = await importOriginal<typeof import('os')>();
  return { ...actual, homedir: () => process.env.__DEVBRAIN_TEST_HOME as string };
});

import {
  withDevbrainHooks, withoutDevbrainHooks, installedDevbrainHooks, formatSessionBriefing, HOOK_EVENTS,
} from './agentHooks';
import { readCursor, writeCursor } from './sessionCursor';
import { buildContext } from './search';
import type { Project } from './types';

const project: Project = { id: 'p1', name: 'demo', path: '/repo/demo', stack: [], createdAt: 1, lastSeen: 1 };

describe('agent hook settings', () => {
  const foreign = { type: 'command', command: 'python lint.py' };

  it('installs every lifecycle hook and keeps the user\'s own', () => {
    const settings = withDevbrainHooks({ model: 'opus', hooks: { Stop: [{ hooks: [foreign] }] } });
    expect(settings.model).toBe('opus');
    expect(installedDevbrainHooks(settings)).toEqual([...HOOK_EVENTS]);
    expect(settings.hooks!.Stop.flatMap(g => g.hooks)).toContainEqual(foreign);
  });

  it('is idempotent', () => {
    const once = withDevbrainHooks({});
    expect(withDevbrainHooks(once)).toEqual(once);
  });

  it('removes hooks for events an earlier version installed', () => {
    const old = { hooks: { SessionEnd: [{ hooks: [{ type: 'command', command: 'devbrain hook session-end' }] }] } };
    expect(withDevbrainHooks(old).hooks!.SessionEnd).toBeUndefined();
  });

  it('uninstalls only its own hooks', () => {
    const removed = withoutDevbrainHooks(withDevbrainHooks({ hooks: { Stop: [{ hooks: [foreign] }] } }));
    expect(removed.hooks).toEqual({ Stop: [{ hooks: [foreign] }] });
    expect(withoutDevbrainHooks(withDevbrainHooks({})).hooks).toBeUndefined();
  });

  it('recognises a hook pointed at an absolute devbrain path', () => {
    const s = { hooks: { Stop: [{ hooks: [{ type: 'command', command: '"C:/tools/devbrain.cmd" hook stop' }] }] } };
    expect(installedDevbrainHooks(s)).toEqual(['Stop']);
  });
});

describe('formatSessionBriefing', () => {
  const entry = {
    id: 'e1', projectId: 'p1', type: 'fix' as const, title: 'Atlas login fails when the password contains @',
    content: 'URL-encode it.', tags: [], createdAt: Date.now(), project,
  };

  it('says nothing for a project with no memory and nothing to review', () => {
    expect(formatSessionBriefing(buildContext([], project))).toBeNull();
  });

  it('briefs the agent and tells it how to reach the rest', () => {
    const text = formatSessionBriefing(buildContext([entry], project))!;
    expect(text).toContain('Atlas login fails');
    expect(text).toContain('search_knowledge');
    expect(text).toMatch(/not as instructions/);
  });

  it('points at backfill when history has not been reviewed', () => {
    const text = formatSessionBriefing(buildContext([], project), { unreviewedCommits: 12 })!;
    expect(text).toContain('12 past commits');
    expect(text).toContain('devbrain backfill');
  });
});

describe('session cursor', () => {
  let home: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'devbrain-cursor-'));
    process.env.__DEVBRAIN_TEST_HOME = home;
  });
  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    delete process.env.__DEVBRAIN_TEST_HOME;
  });

  it('starts at zero and remembers where it stopped', () => {
    expect(readCursor('s1').line).toBe(0);
    writeCursor('s1', 42);
    expect(readCursor('s1').line).toBe(42);
    expect(existsSync(join(home, '.devbrain', 'sessions', 's1.json'))).toBe(true);
  });

  it('keeps an odd session id inside the sessions folder', () => {
    writeCursor('../../evil', 3);
    expect(readCursor('../../evil').line).toBe(3);
    expect(existsSync(join(home, '.devbrain', 'sessions', '______evil.json'))).toBe(true);
  });
});
