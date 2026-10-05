/**
 * Tests for packages/core/src/localStore.ts
 *
 * The local store must behave identically to the Mongo path in db.ts — the
 * backend switch is invisible to callers, so any divergence here is a bug that
 * only shows up for users who haven't configured MONGODB_URI. The confidence
 * tiering and $setOnInsert semantics are the subtle parts.
 *
 * homedir() is mocked so each test gets an isolated store.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Entry, Project } from './types';

vi.mock('os', async importOriginal => {
  const actual = await importOriginal<typeof import('os')>();
  return { ...actual, homedir: () => process.env.__DEVBRAIN_TEST_HOME as string };
});

import {
  getLocalDbPath,
  upsertProject, getProjectByPath, getAllProjects,
  insertEntry, getEntriesByProject, getAllEntriesWithProjects, deleteEntry,
  isCommitProcessed, markCommitProcessed,
  reinforceEntry, bumpRetrievalCounts, bumpRecallCounts, supersedeEntry,
  vectorSearch,
} from './localStore';

// ── helpers ───────────────────────────────────────────────────────────────────

let home: string;

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1', name: 'proj', path: '/repo/a', stack: ['Node.js'],
    createdAt: 1000, lastSeen: 1000, ...overrides,
  };
}

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'e1', projectId: 'p1', type: 'fix', title: 't', content: 'c',
    tags: [], createdAt: 1000, confidence: 'observation', ...overrides,
  } as Entry;
}

/** Unit vector so cosine similarity is predictable. */
function vec(...components: number[]): number[] {
  const mag = Math.sqrt(components.reduce((s, v) => s + v * v, 0));
  return components.map(v => v / mag);
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'devbrain-test-'));
  process.env.__DEVBRAIN_TEST_HOME = home;
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
  delete process.env.__DEVBRAIN_TEST_HOME;
});

// ── projects ──────────────────────────────────────────────────────────────────

describe('projects', () => {
  it('returns null for an unknown path instead of throwing', async () => {
    expect(await getProjectByPath('/nope')).toBeNull();
  });

  it('round-trips a project', async () => {
    await upsertProject(project());
    expect(await getProjectByPath('/repo/a')).toMatchObject({ id: 'p1', name: 'proj' });
  });

  it('upserts by path, not by id — same path replaces', async () => {
    await upsertProject(project({ name: 'old' }));
    await upsertProject(project({ id: 'p2', name: 'new' }));
    const all = await getAllProjects();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: 'p2', name: 'new' });
  });

  it('sorts getAllProjects by lastSeen descending', async () => {
    await upsertProject(project({ id: 'a', path: '/a', lastSeen: 100 }));
    await upsertProject(project({ id: 'b', path: '/b', lastSeen: 300 }));
    await upsertProject(project({ id: 'c', path: '/c', lastSeen: 200 }));
    expect((await getAllProjects()).map(p => p.id)).toEqual(['b', 'c', 'a']);
  });

  it('creates the store directory on first write', async () => {
    expect(existsSync(getLocalDbPath())).toBe(false);
    await upsertProject(project());
    expect(existsSync(getLocalDbPath())).toBe(true);
  });
});

// ── entries ───────────────────────────────────────────────────────────────────

describe('entries', () => {
  it('sorts getEntriesByProject by createdAt descending', async () => {
    await insertEntry(entry({ id: 'old', createdAt: 100 }));
    await insertEntry(entry({ id: 'new', createdAt: 300 }));
    await insertEntry(entry({ id: 'mid', createdAt: 200 }));
    expect((await getEntriesByProject('p1')).map(e => e.id)).toEqual(['new', 'mid', 'old']);
  });

  it('filters getEntriesByProject to the requested project', async () => {
    await insertEntry(entry({ id: 'mine', projectId: 'p1' }));
    await insertEntry(entry({ id: 'theirs', projectId: 'p2' }));
    expect((await getEntriesByProject('p1')).map(e => e.id)).toEqual(['mine']);
  });

  it('joins each entry to its project', async () => {
    await upsertProject(project());
    await insertEntry(entry());
    const [joined] = await getAllEntriesWithProjects();
    expect(joined.project).toMatchObject({ id: 'p1', name: 'proj' });
  });

  it('falls back to a placeholder project for an orphaned projectId', async () => {
    await insertEntry(entry({ projectId: 'gone' }));
    const [joined] = await getAllEntriesWithProjects();
    // Mirrors the $ifNull branch in the Mongo aggregation.
    expect(joined.project).toMatchObject({ id: 'gone', name: 'devbrain', path: '' });
  });

  it('deletes by id and leaves the rest alone', async () => {
    await insertEntry(entry({ id: 'keep' }));
    await insertEntry(entry({ id: 'drop' }));
    await deleteEntry('drop');
    expect((await getEntriesByProject('p1')).map(e => e.id)).toEqual(['keep']);
  });
});

// ── commits ───────────────────────────────────────────────────────────────────

describe('processed commits', () => {
  it('reports unseen commits as unprocessed', async () => {
    expect(await isCommitProcessed('abc')).toBe(false);
  });

  it('marks a commit processed', async () => {
    await markCommitProcessed('abc', 'p1');
    expect(await isCommitProcessed('abc')).toBe(true);
  });

  it('is idempotent — the first write wins, like $setOnInsert', async () => {
    await markCommitProcessed('abc', 'first');
    await markCommitProcessed('abc', 'second');
    const raw = JSON.parse(require('fs').readFileSync(getLocalDbPath(), 'utf-8'));
    expect(raw.processedCommits).toHaveLength(1);
    expect(raw.processedCommits[0].projectId).toBe('first');
  });
});

// ── confidence tiers ──────────────────────────────────────────────────────────

describe('reinforceEntry', () => {
  it('promotes on explicit human confirmation: observation → corroborated → confirmed', async () => {
    // Reinforcement is a person saying "yes, this is right" — the only signal
    // that confirms an entry. One confirmation corroborates, two confirm.
    await insertEntry(entry());
    expect((await getEntriesByProject('p1'))[0].confidence).toBe('observation');
    await reinforceEntry('e1');
    expect((await getEntriesByProject('p1'))[0].confidence).toBe('corroborated');
    await reinforceEntry('e1');
    expect((await getEntriesByProject('p1'))[0].confidence).toBe('confirmed');
  });

  it('counts confirmations separately from retrievals', async () => {
    await insertEntry(entry());
    await reinforceEntry('e1');
    const [e] = await getEntriesByProject('p1');
    expect(e.reinforcedCount).toBe(1);
    expect(e.retrievalCount).toBeUndefined();
  });

  it('applies a content update when given', async () => {
    await insertEntry(entry());
    await reinforceEntry('e1', 'revised');
    expect((await getEntriesByProject('p1'))[0].content).toBe('revised');
  });

  it('ignores an unknown id', async () => {
    await expect(reinforceEntry('nope')).resolves.toBeUndefined();
  });
});

describe('bumpRetrievalCounts', () => {
  it('increments from absent as if the field were 0', async () => {
    await insertEntry(entry());
    await bumpRetrievalCounts(['e1']);
    expect((await getEntriesByProject('p1'))[0].retrievalCount).toBe(1);
  });

  it('never promotes confidence on retrieval alone', async () => {
    // Retrieval is DevBrain reading its own output. Promoting on it made trivial
    // entries read as "confirmed" purely because they ranked well, which is
    // circular and destroys trust in the badge.
    await insertEntry(entry());
    for (let i = 0; i < 5; i++) await bumpRetrievalCounts(['e1']);
    const [e] = await getEntriesByProject('p1');
    expect(e.retrievalCount).toBe(5);
    expect(e.confidence).toBe('observation');
  });

  it('corroborates only when the same knowledge appears in a second project', async () => {
    await insertEntry(entry());
    await bumpRetrievalCounts(['e1'], 'projA');
    expect((await getEntriesByProject('p1'))[0].confidence).toBe('observation');
    await bumpRetrievalCounts(['e1'], 'projB');
    expect((await getEntriesByProject('p1'))[0].confidence).toBe('corroborated');
  });

  it('never demotes an already-confirmed entry', async () => {
    await insertEntry(entry({ confidence: 'confirmed' }));
    await bumpRetrievalCounts(['e1']);
    expect((await getEntriesByProject('p1'))[0].confidence).toBe('confirmed');
  });

  it('records seenInProjects without duplicates, like $addToSet', async () => {
    await insertEntry(entry());
    await bumpRetrievalCounts(['e1'], 'px');
    await bumpRetrievalCounts(['e1'], 'px');
    await bumpRetrievalCounts(['e1'], 'py');
    expect((await getEntriesByProject('p1'))[0].seenInProjects).toEqual(['px', 'py']);
  });

  it('touches only the listed ids', async () => {
    await insertEntry(entry({ id: 'hit' }));
    await insertEntry(entry({ id: 'miss' }));
    await bumpRetrievalCounts(['hit']);
    const byId = Object.fromEntries((await getEntriesByProject('p1')).map(e => [e.id, e]));
    expect(byId.hit.retrievalCount).toBe(1);
    expect(byId.miss.retrievalCount).toBeUndefined();
  });

  it('is a no-op for an empty id list', async () => {
    await insertEntry(entry());
    await bumpRetrievalCounts([]);
    expect((await getEntriesByProject('p1'))[0].retrievalCount).toBeUndefined();
  });
});

describe('supersedeEntry', () => {
  it('records the superseding id and a timestamp', async () => {
    await insertEntry(entry());
    await supersedeEntry('e1', 'e2');
    const [e] = await getEntriesByProject('p1');
    expect(e.supersededBy).toBe('e2');
    expect(e.supersededAt).toBeGreaterThan(0);
  });
});

// ── vector search ─────────────────────────────────────────────────────────────

describe('vectorSearch', () => {
  beforeEach(async () => {
    await upsertProject(project());
    await insertEntry(entry({ id: 'exact',    embedding: vec(1, 0, 0) }));
    await insertEntry(entry({ id: 'oblique',  embedding: vec(1, 1, 0) }));
    await insertEntry(entry({ id: 'opposite', embedding: vec(-1, 0, 0) }));
  });

  it('ranks by descending cosine similarity', async () => {
    const hits = await vectorSearch(vec(1, 0, 0));
    expect(hits.map(h => h.id)).toEqual(['exact', 'oblique', 'opposite']);
    expect(hits[0].vectorScore).toBeCloseTo(1, 5);
  });

  it('honours topK', async () => {
    expect(await vectorSearch(vec(1, 0, 0), { topK: 2 })).toHaveLength(2);
  });

  it('filters by projectId', async () => {
    await insertEntry(entry({ id: 'other', projectId: 'p2', embedding: vec(1, 0, 0) }));
    const hits = await vectorSearch(vec(1, 0, 0), { projectId: 'p2' });
    expect(hits.map(h => h.id)).toEqual(['other']);
  });

  it('skips entries with no embedding', async () => {
    await insertEntry(entry({ id: 'bare' }));
    const hits = await vectorSearch(vec(1, 0, 0));
    expect(hits.map(h => h.id)).not.toContain('bare');
  });

  it('attaches the joined project', async () => {
    const [hit] = await vectorSearch(vec(1, 0, 0));
    expect(hit.project).toMatchObject({ id: 'p1', name: 'proj' });
  });
});

// ── durability ────────────────────────────────────────────────────────────────

describe('store integrity', () => {
  it('reads an empty store as empty rather than failing', async () => {
    expect(await getAllEntriesWithProjects()).toEqual([]);
    expect(await getAllProjects()).toEqual([]);
  });

  it('throws on a corrupt store instead of silently discarding it', async () => {
    await upsertProject(project());
    writeFileSync(getLocalDbPath(), '{ not json', 'utf-8');
    // Treating a parse failure as "empty" would overwrite real memory on the
    // next save, so this must surface loudly.
    await expect(getAllProjects()).rejects.toThrow(/not valid JSON/);
  });

  it('tolerates a store missing individual collections', async () => {
    mkdirSync(join(home, '.devbrain'), { recursive: true });
    writeFileSync(getLocalDbPath(), JSON.stringify({ version: 1 }), 'utf-8');
    expect(await getAllProjects()).toEqual([]);
    expect(await isCommitProcessed('x')).toBe(false);
  });

  it('persists across independent reads', async () => {
    await insertEntry(entry({ id: 'durable' }));
    expect((await getEntriesByProject('p1')).map(e => e.id)).toEqual(['durable']);
    expect((await getAllEntriesWithProjects()).map(e => e.id)).toEqual(['durable']);
  });
});

describe('bumpRecallCounts', () => {
  it('counts the recall', async () => {
    await insertEntry(entry());
    await bumpRecallCounts(['e1'], { query: 'TokenExpiredError: jwt expired' });
    const [e] = await getEntriesByProject('p1');
    expect(e.recallCount).toBe(1);
    expect(e.lastRecalledAt).toBeGreaterThan(0);
  });

  // The count alone cannot tell an entry that caught nine different failures
  // from one that matched the same flaky command nine times.
  it('records what matched, so the log says something', async () => {
    await insertEntry(entry());
    await bumpRecallCounts(['e1'], { query: 'ECONNREFUSED 127.0.0.1:27017', sessionId: 's1' });
    const [e] = await getEntriesByProject('p1');
    expect(e.recalls).toHaveLength(1);
    expect(e.recalls![0].query).toBe('ECONNREFUSED 127.0.0.1:27017');
    expect(e.recalls![0].sessionId).toBe('s1');
  });

  it('adds no blank row when there is nothing to say about what matched', async () => {
    await insertEntry(entry());
    await bumpRecallCounts(['e1']);
    const [e] = await getEntriesByProject('p1');
    expect(e.recallCount).toBe(1);
    expect(e.recalls).toBeUndefined();
  });

  // This rides along with every read of the entry, so an entry that fires often
  // must not grow a log file inside itself.
  it('keeps only the most recent, oldest falling off the front', async () => {
    await insertEntry(entry());
    for (let i = 0; i < 25; i++) await bumpRecallCounts(['e1'], { query: `failure ${i}` });
    const [e] = await getEntriesByProject('p1');
    expect(e.recallCount).toBe(25);
    expect(e.recalls).toHaveLength(20);
    expect(e.recalls![0].query).toBe('failure 5');
    expect(e.recalls![19].query).toBe('failure 24');
  });

  it('clips a query too long to be worth storing whole', async () => {
    await insertEntry(entry());
    await bumpRecallCounts(['e1'], { query: 'x'.repeat(500) });
    const [e] = await getEntriesByProject('p1');
    expect(e.recalls![0].query).toHaveLength(200);
  });

  it('leaves entries it was not given alone', async () => {
    await insertEntry(entry());
    await insertEntry({ ...entry(), id: 'e2' });
    await bumpRecallCounts(['e1'], { query: 'boom' });
    const other = (await getEntriesByProject('p1')).find(e => e.id === 'e2')!;
    expect(other.recallCount).toBeUndefined();
    expect(other.recalls).toBeUndefined();
  });
});
