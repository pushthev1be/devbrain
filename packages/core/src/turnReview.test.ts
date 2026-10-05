/**
 * Tests for agent-authored capture and for working with no AI service at all.
 *
 * The contract: DevBrain asks the agent to record a stretch only when it
 * worked something out and nothing was saved; it never asks twice for the same
 * stretch; and storing, deduplicating and finding entries need no model.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

vi.mock('os', async importOriginal => {
  const actual = await importOriginal<typeof import('os')>();
  return { ...actual, homedir: () => process.env.__DEVBRAIN_TEST_HOME as string };
});

import { reviewTurn, buildRecordPrompt } from './turnReview';
import { parseTranscript } from './transcript';
import { keywordScore, keywordTerms, preciseSearch, buildContext } from './search';
import { findTextDuplicate, titleOverlap } from './dedupe';
import { upsertProject, insertEntry } from './db';
import type { Entry, Project } from './types';

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
const jsonl = (...lines: string[]) => lines.join('\n') + '\n';

const failing = tool('Bash', { command: 'npm start' }, 'MongoServerError: bad auth : authentication failed', true);
const edit = tool('Edit', { file_path: 'C:\\repo\\src\\db.ts' }, 'ok');

describe('reviewTurn', () => {
  it('asks the agent to record a fix it made and did not save', () => {
    const t = jsonl(user('login fails'), failing, edit, say('The password needed URL-encoding.'));
    const r = reviewTurn(t, 0);
    expect(r.action).toBe('ask');
    expect(r.cursor).toBe(6);
    expect(r.prompt).toContain('MongoServerError: bad auth : authentication failed');
    expect(r.prompt).toContain('src/db.ts');
    expect(r.prompt).toContain('save_entry');
  });

  it('does not ask when the agent already saved through the MCP tool', () => {
    const t = jsonl(failing, edit, tool('mcp__devbrain__save_entry', { title: 'Atlas login fails on @ in password' }, 'saved'));
    expect(reviewTurn(t, 0)).toEqual({ action: 'recorded', cursor: 6 });
  });

  it('recognises a save under any MCP server prefix, or through the CLI', () => {
    const viaConnector = jsonl(failing, edit, tool('mcp__claude_ai_DevBrain__save_entry', { title: 'x' }, 'ok'));
    const viaCli = jsonl(failing, edit, tool('Bash', { command: 'devbrain note "fix: x"' }, 'ok'));
    expect(reviewTurn(viaConnector, 0).action).toBe('recorded');
    expect(reviewTurn(viaCli, 0).action).toBe('recorded');
  });

  it('never asks twice for the same stretch', () => {
    const t = jsonl(failing, edit);
    const first = reviewTurn(t, 0);
    expect(first.action).toBe('ask');
    expect(reviewTurn(t, first.cursor).action).toBe('hold');
  });

  it('waits while the error is still open', () => {
    expect(reviewTurn(jsonl(edit, failing), 0)).toEqual({ action: 'hold', cursor: 0 });
  });

  it('holds a quiet stretch so it is judged with what comes next', () => {
    const quiet = jsonl(user('where is auth?'), say('src/auth.ts'));
    expect(reviewTurn(quiet, 0)).toEqual({ action: 'hold', cursor: 0 });
    expect(reviewTurn(quiet + jsonl(failing, edit), 0).action).toBe('ask');
  });

  it('lets go of a very long quiet stretch instead of re-reading it every turn', () => {
    const t = jsonl(...Array.from({ length: 700 }, (_, i) => say(`note ${i}`)));
    expect(reviewTurn(t, 0)).toEqual({ action: 'hold', cursor: 700 });
  });
});

describe('buildRecordPrompt', () => {
  it('shows each distinct error once and names files briefly', () => {
    const { events } = parseTranscript(jsonl(failing, failing, edit, edit));
    const prompt = buildRecordPrompt(events);
    expect(prompt.match(/error seen/g)).toHaveLength(1);
    expect(prompt).toContain('files changed: src/db.ts');
  });
});

// ── no AI: keywords instead of embeddings ─────────────────────────────────────

const project: Project = { id: 'p1', name: 'demo', path: '/repo/demo', stack: [], createdAt: 1, lastSeen: 1 };
const entry = (o: Partial<Entry>): Entry & { project: Project } => ({
  id: 'e', projectId: 'p1', type: 'fix', title: '', content: '', tags: [],
  createdAt: Date.now(), confidence: 'observation', project, ...o,
} as Entry & { project: Project });

describe('keyword relevance', () => {
  const atlas = entry({
    id: 'a', title: 'Atlas login fails when the password contains @',
    content: 'URL-encode the password in MONGODB_URI.', tags: ['mongodb'],
    errorPattern: 'MongoServerError: bad auth : authentication failed',
  });
  const css = entry({ id: 'c', title: 'Safe-area overlap on iOS notch', content: 'Use env(safe-area-inset-top).', tags: ['css'] });

  it('ignores words every query carries', () => {
    expect(keywordTerms('any fixes for the bug')).toEqual([]);
  });

  it('scores title and error matches above body-only matches', () => {
    expect(keywordScore('mongodb password', atlas)).toBe(1);
    expect(keywordScore('encode', atlas)).toBeCloseTo(0.6);
    expect(keywordScore('notch overlap', atlas)).toBe(0);
  });

  it('search finds the right entry with no embedding at all', () => {
    const results = preciseSearch('MongoServerError bad auth', [], [css, atlas], { threshold: 0.45 });
    expect(results.map(r => r.entry.id)).toEqual(['a']);
  });

  it('context leans toward the task even without embeddings', () => {
    const ctx = buildContext([css, atlas], project, undefined, 'mongodb login');
    expect(ctx.issues[0].entry.id).toBe('a');
  });
});

describe('text duplicate check', () => {
  let home: string;
  beforeEach(async () => {
    home = mkdtempSync(join(tmpdir(), 'devbrain-turn-'));
    process.env.__DEVBRAIN_TEST_HOME = home;
    delete process.env.MONGODB_URI;
    await upsertProject(project);
  });
  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    delete process.env.__DEVBRAIN_TEST_HOME;
  });

  it('treats a restated title as the same knowledge', async () => {
    const { project: _, ...stored } = entry({ id: 'x', title: 'Atlas login fails when password contains @' });
    await insertEntry(stored);
    expect(titleOverlap('Atlas login fails if the password contains @', stored.title)).toBeGreaterThanOrEqual(0.75);
    expect((await findTextDuplicate('Atlas login fails if the password contains @', 'p1'))?.entry.id).toBe('x');
    expect(await findTextDuplicate('Atlas cluster paused after inactivity', 'p1')).toBeNull();
  });
});
