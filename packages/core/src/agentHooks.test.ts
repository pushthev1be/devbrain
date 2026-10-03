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
  briefingEntries, isAlreadyInAgentContext,
} from './agentHooks';
import type { Entry } from './types';
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

  it('installs PostToolUse per shell tool, so recall fires when a command fails', () => {
    const groups = withDevbrainHooks({}).hooks!.PostToolUse;
    expect(groups.map(g => g.matcher)).toEqual(['Bash', 'PowerShell']);
    expect(groups[0].hooks[0].command).toContain('hook post-tool');
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

  it('names what it left out, so the briefing does not read as everything stored', () => {
    const text = formatSessionBriefing(buildContext([], project), {
      indexedFromFile: { file: 'CLAUDE.md', count: 49 },
    })!;
    expect(text).toContain('49 further entries are indexed from CLAUDE.md');
    expect(text).toContain('searchable by error text');
  });
});

// ── not restating a file the agent already has ───────────────────────────────

describe('briefingEntries', () => {
  const sourced = (file: string, projectId = 'p1'): Entry => ({
    id: `e-${file}-${projectId}`, projectId, type: 'lesson', title: `from ${file}`,
    content: 'x', tags: [], createdAt: 1, confidence: 'observation',
    source: { file, anchor: 'a', hash: 'h', heading: 'H', indexedAt: 1 },
  });
  const captured: Entry = {
    id: 'own', projectId: 'p1', type: 'fix', title: 'captured from work',
    content: 'x', tags: [], createdAt: 1, confidence: 'observation',
  };

  it('leaves out this project\'s CLAUDE.md — the agent already loaded it', () => {
    expect(briefingEntries([captured, sourced('CLAUDE.md')], 'p1').map(e => e.id)).toEqual(['own']);
    expect(isAlreadyInAgentContext(sourced('CLAUDE.md'), 'p1')).toBe(true);
  });

  it('keeps another project\'s CLAUDE.md — that is why the file is indexed', () => {
    const other = sourced('CLAUDE.md', 'p2');
    expect(briefingEntries([other], 'p1')).toEqual([other]);
    expect(isAlreadyInAgentContext(other, 'p1')).toBe(false);
  });

  it('keeps a file the agent does not load on its own', () => {
    for (const file of ['DEVBRAIN.md', 'docs/ENGINEERING.md']) {
      expect(briefingEntries([sourced(file)], 'p1')).toHaveLength(1);
    }
  });

  it('matches CLAUDE.md in a subdirectory, on either path separator', () => {
    expect(isAlreadyInAgentContext(sourced('packages/api/CLAUDE.md'), 'p1')).toBe(true);
    expect(isAlreadyInAgentContext(sourced('packages\\api\\AGENTS.md'), 'p1')).toBe(true);
  });

  it('keeps everything when the project is unknown', () => {
    expect(briefingEntries([captured, sourced('CLAUDE.md')], undefined)).toHaveLength(2);
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
