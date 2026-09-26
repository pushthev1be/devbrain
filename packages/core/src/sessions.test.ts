/**
 * Tests for session tracking and shared duplicate detection.
 *
 * Both exist to close gaps where DevBrain silently lost knowledge:
 *   - a session that ended without a recap simply vanished, and nothing noticed
 *   - agent and dashboard saves had no duplicate check, so the same insight
 *     saved twice during a long task produced two entries
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Entry, Project } from './types';

vi.mock('os', async importOriginal => {
  const actual = await importOriginal<typeof import('os')>();
  return { ...actual, homedir: () => process.env.__DEVBRAIN_TEST_HOME as string };
});

import { upsertProject, insertEntry } from './db';
import {
  startSession, endSession, getOpenSession, getAbandonedSession,
  describeAbandonedSession, STALE_SESSION_MS,
} from './sessions';
import { findDuplicate, isDuplicateEntry, AUTO_DUPLICATE_THRESHOLD } from './dedupe';

let home: string;

const project: Project = {
  id: 'p1', name: 'demo', path: '/repo/demo', stack: [], createdAt: 1, lastSeen: 1,
};

/** Unit vector so cosine similarity is predictable. */
function vec(...c: number[]): number[] {
  const mag = Math.sqrt(c.reduce((s, v) => s + v * v, 0));
  return c.map(v => v / mag);
}

function entry(o: Partial<Entry> = {}): Entry {
  return {
    id: 'e1', projectId: 'p1', type: 'fix', title: 't', content: 'c',
    tags: [], createdAt: 1, confidence: 'observation', ...o,
  } as Entry;
}

beforeEach(async () => {
  home = mkdtempSync(join(tmpdir(), 'devbrain-sess-'));
  process.env.__DEVBRAIN_TEST_HOME = home;
  delete process.env.MONGODB_URI;              // force the local backend
  await upsertProject(project);
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
  delete process.env.__DEVBRAIN_TEST_HOME;
});

describe('session lifecycle', () => {
  it('has no open session to begin with', async () => {
    expect(await getOpenSession('p1')).toBeNull();
  });

  it('records what the session was about', async () => {
    await startSession('p1', 'fix the auth token expiry bug');
    const open = await getOpenSession('p1');
    expect(open?.description).toBe('fix the auth token expiry bug');
    expect(open?.startedAt).toBeGreaterThan(0);
  });

  it('closes on task_end', async () => {
    await startSession('p1', 'something');
    await endSession('p1');
    expect(await getOpenSession('p1')).toBeNull();
  });

  it('ignores an unknown project rather than throwing', async () => {
    await expect(startSession('nope', 'x')).resolves.toBeUndefined();
    await expect(endSession('nope')).resolves.toBeUndefined();
  });

  it('truncates an over-long description', async () => {
    await startSession('p1', 'x'.repeat(500));
    expect((await getOpenSession('p1'))!.description).toHaveLength(200);
  });

  it('starting a new session replaces the previous one', async () => {
    await startSession('p1', 'first');
    await startSession('p1', 'second');
    expect((await getOpenSession('p1'))!.description).toBe('second');
  });
});

describe('abandoned sessions', () => {
  it('does not flag work that is still in progress', async () => {
    await startSession('p1', 'in progress right now');
    expect(await getAbandonedSession('p1')).toBeNull();
  });

  it('flags a session left open past the staleness window', async () => {
    await startSession('p1', 'forgot to recap this');
    const later = Date.now() + STALE_SESSION_MS + 1000;
    const abandoned = await getAbandonedSession('p1', later);
    expect(abandoned?.description).toBe('forgot to recap this');
  });

  it('stops flagging once the session is recapped', async () => {
    await startSession('p1', 'work');
    await endSession('p1');
    expect(await getAbandonedSession('p1', Date.now() + STALE_SESSION_MS * 5)).toBeNull();
  });

  it('describes the gap in terms a person can act on', async () => {
    await startSession('p1', 'refactor the storage layer');
    const later = Date.now() + 3 * 3_600_000;
    const note = describeAbandonedSession(await getAbandonedSession('p1', later), later);
    expect(note).toContain('refactor the storage layer');
    expect(note).toContain('3h ago');
    expect(note).toMatch(/not saved/);
  });

  it('says nothing when there is nothing to say', () => {
    expect(describeAbandonedSession(null)).toBeNull();
  });
});

describe('shared duplicate detection', () => {
  beforeEach(async () => {
    await insertEntry(entry({ id: 'existing', title: 'known issue', embedding: vec(1, 0, 0) }));
  });

  it('finds a near-identical entry', async () => {
    const hit = await findDuplicate(vec(1, 0.02, 0), 'p1');
    expect(hit?.entry.id).toBe('existing');
    expect(hit!.similarity).toBeGreaterThan(AUTO_DUPLICATE_THRESHOLD);
  });

  it('lets a genuinely different entry through', async () => {
    expect(await findDuplicate(vec(0, 1, 0), 'p1')).toBeNull();
  });

  it('does not match across projects', async () => {
    expect(await findDuplicate(vec(1, 0, 0), 'other-project')).toBeNull();
  });

  it('ignores superseded entries, so retired knowledge cannot block a new note', async () => {
    await insertEntry(entry({ id: 'old', title: 'retired', embedding: vec(0, 1, 0), supersededBy: 'x' }));
    expect(await findDuplicate(vec(0, 1, 0), 'p1')).toBeNull();
  });

  it('treats an empty embedding as not-a-duplicate rather than failing', async () => {
    expect(await findDuplicate([], 'p1')).toBeNull();
    expect(await isDuplicateEntry([], 'p1')).toBe(false);
  });

  it('honours a looser threshold for the interactive path', async () => {
    const somewhatSimilar = vec(1, 0.45, 0);
    expect(await isDuplicateEntry(somewhatSimilar, 'p1', 0.95)).toBe(false);
    expect(await isDuplicateEntry(somewhatSimilar, 'p1', 0.85)).toBe(true);
  });
});
