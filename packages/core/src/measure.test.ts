/**
 * Tests for the counters that say whether memory earned its keep.
 *
 * These exist to stop the measurement flattering itself. The number has to move
 * only when an entry caught a real failure — never when it was merely shown —
 * or it becomes another retrievalCount: large, rising, and meaningless.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

vi.mock('os', async importOriginal => {
  const actual = await importOriginal<typeof import('os')>();
  return { ...actual, homedir: () => process.env.__DEVBRAIN_TEST_HOME as string };
});

import { measureUse, describeUse } from './measure';
import {
  upsertProject, insertEntry, getEntriesByProject,
  bumpRecallCounts, bumpRetrievalCounts, supersedeEntry,
} from './db';
import type { Entry, Project } from './types';

const project: Project = { id: 'p1', name: 'app', path: '/repo/app', stack: [], createdAt: 1, lastSeen: 1 };

const entry = (o: Partial<Entry> = {}): Entry => ({
  id: 'e1', projectId: 'p1', type: 'fix', title: 't', content: 'c',
  tags: [], createdAt: 1, confidence: 'observation', ...o,
} as Entry);

describe('measureUse', () => {
  it('reports nothing earned when nothing has been recalled', () => {
    const use = measureUse([entry({ id: 'a', retrievalCount: 40 }), entry({ id: 'b' })]);
    expect(use.entries).toBe(2);
    expect(use.earned).toBe(0);
    expect(use.recalls).toBe(0);
    // 40 surfacings is not evidence of anything — that is the whole point.
    expect(use.earnedShare).toBe(0);
  });

  it('counts entries that caught a failure, and the catches', () => {
    const use = measureUse([
      entry({ id: 'a', recallCount: 3 }),
      entry({ id: 'b', recallCount: 1 }),
      entry({ id: 'c' }),
    ]);
    expect(use.earned).toBe(2);
    expect(use.recalls).toBe(4);
    expect(use.earnedShare).toBeCloseTo(2 / 3);
  });

  it('does not count retracted entries as stock', () => {
    const use = measureUse([entry({ id: 'a' }), entry({ id: 'b', supersededBy: 'a' })]);
    expect(use.entries).toBe(1);
    expect(use.retracted).toBe(1);
  });

  it('counts entries never surfaced by any path', () => {
    const use = measureUse([
      entry({ id: 'a' }),
      entry({ id: 'b', retrievalCount: 2 }),
      entry({ id: 'c', recallCount: 1 }),
    ]);
    expect(use.neverSurfaced).toBe(1);
  });

  it('counts revisions', () => {
    const use = measureUse([entry({ id: 'a', revisionCount: 2 }), entry({ id: 'b' })]);
    expect(use.revised).toBe(1);
    expect(use.revisions).toBe(2);
  });
});

describe('describeUse', () => {
  it('says so plainly while nothing has been caught', () => {
    expect(describeUse(measureUse([entry({ retrievalCount: 99 })])))
      .toBe('1 entries · none has caught a failure yet');
  });

  it('reports the share once something has', () => {
    const text = describeUse(measureUse([entry({ id: 'a', recallCount: 2 }), entry({ id: 'b' })]));
    expect(text).toContain('1 (50%) caught a failure');
    expect(text).toContain('2 catches in total');
  });

  it('has something to say about an empty store', () => {
    expect(describeUse(measureUse([]))).toBe('Nothing recorded yet.');
  });
});

describe('the counters, against the store', () => {
  let home: string;
  beforeEach(async () => {
    home = mkdtempSync(join(tmpdir(), 'devbrain-measure-'));
    process.env.__DEVBRAIN_TEST_HOME = home;
    delete process.env.MONGODB_URI;
    await upsertProject(project);
  });
  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    delete process.env.__DEVBRAIN_TEST_HOME;
  });

  it('being shown does not count as catching anything', async () => {
    await insertEntry(entry({ id: 'a' }));
    await bumpRetrievalCounts(['a'], 'p1');
    await bumpRetrievalCounts(['a'], 'p1');
    const [stored] = await getEntriesByProject('p1');
    expect(stored.retrievalCount).toBe(2);
    expect(stored.recallCount ?? 0).toBe(0);
    expect(measureUse([stored]).earned).toBe(0);
  });

  it('catching a failure counts, and stamps when', async () => {
    await insertEntry(entry({ id: 'a' }));
    await bumpRecallCounts(['a']);
    await bumpRecallCounts(['a']);
    const [stored] = await getEntriesByProject('p1');
    expect(stored.recallCount).toBe(2);
    expect(stored.lastRecalledAt).toBeGreaterThan(0);
    expect(measureUse([stored]).earned).toBe(1);
  });

  it('a correction carries the chain depth onto its replacement', async () => {
    await insertEntry(entry({ id: 'v1', title: 'first try' }));
    await insertEntry(entry({ id: 'v2', title: 'corrected' }));
    await supersedeEntry('v1', 'v2');

    let byId = Object.fromEntries((await getEntriesByProject('p1')).map(e => [e.id, e]));
    expect(byId.v1.supersededBy).toBe('v2');
    expect(byId.v2.supersedes).toBe('v1');
    expect(byId.v2.revisionCount).toBe(1);

    // A second correction continues the chain rather than restarting it.
    await insertEntry(entry({ id: 'v3', title: 'corrected again' }));
    await supersedeEntry('v2', 'v3');
    byId = Object.fromEntries((await getEntriesByProject('p1')).map(e => [e.id, e]));
    expect(byId.v3.revisionCount).toBe(2);
    expect(measureUse(Object.values(byId)).revised).toBe(1);
  });
});
