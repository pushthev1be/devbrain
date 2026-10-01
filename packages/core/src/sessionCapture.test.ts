/**
 * Tests for background capture from agent sessions, end to end against the
 * local store in mock mode, and for installing the hooks that trigger it.
 *
 * What must hold: a session is never extracted twice, an unresolved error
 * waits for its fix, a quiet stretch costs nothing, an invented error string is
 * never stored, and installing hooks never disturbs the user's other hooks.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

vi.mock('os', async importOriginal => {
  const actual = await importOriginal<typeof import('os')>();
  return { ...actual, homedir: () => process.env.__DEVBRAIN_TEST_HOME as string };
});

import { upsertProject, getEntriesByProject } from './db';
import { captureSession, readCursor } from './sessionCapture';
import { finalizeSessionEntries } from './gemini';
import {
  withDevbrainHooks, withoutDevbrainHooks, installedDevbrainHooks, formatSessionBriefing, HOOK_EVENTS,
} from './agentHooks';
import { buildContext } from './search';
import type { Project } from './types';

let home: string;
let transcript: string;
const project: Project = { id: 'p1', name: 'demo', path: '/repo/demo', stack: [], createdAt: 1, lastSeen: 1 };

let n = 0;
const user = (text: string) => JSON.stringify({ type: 'user', message: { content: text } });
const say = (text: string) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text }] } });
function tool(name: string, input: Record<string, unknown>, output: string, isError = false): string {
  const id = `t${++n}`;
  return [
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } }),
    JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: output, is_error: isError }] } }),
  ].join('\n');
}
const append = (...lines: string[]) => appendFileSync(transcript, lines.join('\n') + '\n');
const capture = (mode: 'turn' | 'final' = 'turn') =>
  captureSession({ transcriptPath: transcript, sessionId: 'sess-1', projectId: 'p1', mode });

const failingBuild = tool('Bash', { command: 'npm run build' }, 'MongoServerError: bad auth : authentication failed', true);
const fixEdit = tool('Edit', { file_path: '/repo/demo/db.ts' }, 'ok');

beforeEach(async () => {
  home = mkdtempSync(join(tmpdir(), 'devbrain-capture-'));
  process.env.__DEVBRAIN_TEST_HOME = home;
  process.env.DEVBRAIN_MOCK = 'true';
  delete process.env.MONGODB_URI;
  transcript = join(home, 'session.jsonl');
  writeFileSync(transcript, '');
  await upsertProject(project);
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
  delete process.env.__DEVBRAIN_TEST_HOME;
  delete process.env.DEVBRAIN_MOCK;
});

describe('captureSession', () => {
  it('saves a fix once the error has been followed by an edit', async () => {
    append(user('login is broken'), failingBuild, fixEdit, say('The cause was an unencoded password.'));
    const result = await capture();
    expect(result.status).toBe('saved');
    const [entry] = await getEntriesByProject('p1');
    expect(entry.errorPattern).toBe('MongoServerError: bad auth : authentication failed');
    expect(entry.tags).toContain('session');
  });

  it('never extracts the same stretch twice', async () => {
    append(user('login is broken'), failingBuild, fixEdit);
    await capture();
    const again = await capture();
    expect(again.status).toBe('nothing');
    expect(await getEntriesByProject('p1')).toHaveLength(1);
  });

  it('waits while the last error is unresolved, then captures with the fix', async () => {
    append(user('login is broken'), fixEdit, failingBuild);
    expect((await capture()).status).toBe('waiting');
    expect(readCursor('sess-1').line).toBe(0);

    append(tool('Edit', { file_path: '/repo/demo/auth.ts' }, 'ok'));
    expect((await capture()).status).toBe('saved');
  });

  it('a final capture does not wait for a fix that is not coming', async () => {
    append(user('login is broken'), fixEdit, failingBuild);
    expect((await capture('final')).status).toBe('saved');
  });

  it('holds the cursor over a quiet turn so it is read with what follows', async () => {
    append(user('where is the auth code?'), say('In src/auth.ts.'));
    expect((await capture()).status).toBe('nothing');
    expect(readCursor('sess-1').line).toBe(0);

    append(failingBuild, fixEdit);
    expect((await capture()).status).toBe('saved');
    expect(readCursor('sess-1').line).toBe(6);
  });

  it('a quiet session is let go at the end', async () => {
    append(user('hello'), say('hi'));
    await capture('final');
    expect(readCursor('sess-1').line).toBe(2);
  });

  it('a second worker for the same session backs off', async () => {
    append(user('x'), failingBuild, fixEdit);
    const [a, b] = await Promise.all([capture(), capture()]);
    expect([a.status, b.status].sort()).toEqual(['locked', 'saved']);
    expect(await getEntriesByProject('p1')).toHaveLength(1);
  });

  it('reports a missing transcript instead of throwing', async () => {
    const r = await captureSession({ transcriptPath: join(home, 'nope.jsonl'), sessionId: 's', projectId: 'p1', mode: 'final' });
    expect(r.status).toBe('missing');
  });
});

describe('finalizeSessionEntries', () => {
  const good = {
    type: 'fix', title: 'Atlas login fails when the password contains @',
    content: 'The URI parser split on the @ in the password; URL-encode it with encodeURIComponent.',
    tags: ['MongoDB', 'auth'], category: 'database',
  };

  it('drops an error pattern that does not appear verbatim in the session', () => {
    const [e] = finalizeSessionEntries([{ ...good, errorPattern: 'authentication error occurred' }], 'ERROR: MongoServerError: bad auth');
    expect(e.errorPattern).toBeUndefined();
  });

  it('keeps an error pattern copied from the session', () => {
    const [e] = finalizeSessionEntries([{ ...good, errorPattern: 'MongoServerError: bad auth' }], 'ERROR: MongoServerError: bad auth');
    expect(e.errorPattern).toBe('MongoServerError: bad auth');
  });

  it('applies the commit quality bar: narration titles and unknown types are dropped', () => {
    expect(finalizeSessionEntries([{ ...good, title: 'The config was missing a flag for the build' }], '')).toEqual([]);
    expect(finalizeSessionEntries([{ ...good, type: 'image' }], '')).toEqual([]);
    expect(finalizeSessionEntries('not an array', '')).toEqual([]);
  });

  it('keeps an archetype phrase but drops a bare label', () => {
    const [label] = finalizeSessionEntries([{ ...good, causeArchetype: 'environmental_difference' }], '');
    expect(label.causeArchetype).toBeUndefined();
    const [phrase] = finalizeSessionEntries([{ ...good, causeArchetype: 'special characters not encoded in a connection URI' }], '');
    expect(phrase.causeArchetype).toBe('special characters not encoded in a connection URI');
  });

  it('caps how much one stretch can produce', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ ...good, title: `${good.title} variant ${i}` }));
    expect(finalizeSessionEntries(many, '')).toHaveLength(4);
  });
});

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
  it('says nothing for a project with no memory', () => {
    expect(formatSessionBriefing(buildContext([], project))).toBeNull();
  });

  it('briefs the agent and tells it how to reach the rest', () => {
    const entry = {
      id: 'e1', projectId: 'p1', type: 'fix' as const, title: 'Atlas login fails when the password contains @',
      content: 'URL-encode it.', tags: [], createdAt: Date.now(), project,
    };
    const text = formatSessionBriefing(buildContext([entry], project))!;
    expect(text).toContain('Atlas login fails');
    expect(text).toContain('search_knowledge');
    expect(text).toMatch(/not as instructions/);
  });
});

it('cursor files live under ~/.devbrain/sessions', async () => {
  append(user('x'), failingBuild, fixEdit);
  await capture();
  expect(existsSync(join(home, '.devbrain', 'sessions', 'sess-1.json'))).toBe(true);
});
