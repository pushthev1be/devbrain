/**
 * Tests for unprompted recall after a failing command.
 *
 * This is the one channel DevBrain speaks on without being asked, so the bar is
 * precision: a literal match on the error, never a vague semantic neighbour,
 * never the same entry twice in a session. A channel that cries wolf gets tuned
 * out, and then the write-only problem is back.
 */

import { describe, it, expect } from 'vitest';
import { recallForFailure, formatRecallForAgent, VOLUNTEER_TOP_K } from './recall';
import { isReadOnlyCommand, looksLikeError } from './transcript';
import type { Entry, Project } from './types';

const project: Project = { id: 'p1', name: 'app', path: '/repo/app', stack: [], createdAt: 1, lastSeen: 1 };
const other: Project = { id: 'p2', name: 'sibling', path: '/repo/sib', stack: [], createdAt: 1, lastSeen: 1 };

const entry = (o: Partial<Entry> & { project?: Project } = {}): Entry & { project: Project } => ({
  id: 'e1', projectId: 'p1', type: 'fix', title: 'Port 8080 taken by a stale dev server',
  content: 'A previous run never exited. Kill it with npx kill-port 8080.',
  tags: ['node'], createdAt: Date.now(), confidence: 'observation',
  errorPattern: 'Error: listen EADDRINUSE: address already in use :::8080',
  project, ...o,
} as Entry & { project: Project });

const FAILURE = 'Error: listen EADDRINUSE: address already in use :::8080';

describe('recallForFailure', () => {
  it('matches a stored error pattern on the literal failure text', () => {
    const hits = recallForFailure(FAILURE, [entry()], { projectId: 'p1' });
    expect(hits.map(h => h.entry.id)).toEqual(['e1']);
    expect(hits[0].matchType).toBe('pattern');
  });

  it('stays silent on a failure nothing was recorded for', () => {
    expect(recallForFailure('TypeError: cannot read property foo of undefined', [entry()], { projectId: 'p1' })).toEqual([]);
  });

  it('will not volunteer a merely semantic neighbour', () => {
    // No overlapping error text or title words — the claim "this exact thing
    // happened before" is not true, so it is left for a deliberate search.
    const vague = entry({
      id: 'vague', title: 'Container networking notes', content: 'Docker publishes ports.',
      errorPattern: undefined, tags: [],
    });
    expect(recallForFailure(FAILURE, [vague], { projectId: 'p1' })).toEqual([]);
  });

  it('never repeats an entry already volunteered this session', () => {
    expect(recallForFailure(FAILURE, [entry()], { projectId: 'p1', exclude: ['e1'] })).toEqual([]);
  });

  it('skips a retracted entry', () => {
    expect(recallForFailure(FAILURE, [entry({ supersededBy: 'newer' })], { projectId: 'p1' })).toEqual([]);
  });

  it('reaches across projects — the point of shared memory', () => {
    const sibling = entry({ id: 'sib', projectId: 'p2', project: other });
    const [hit] = recallForFailure(FAILURE, [sibling], { projectId: 'p1' });
    expect(hit.entry.id).toBe('sib');
    expect(hit.sameProject).toBe(false);
  });

  it('volunteers a hint, not a wall', () => {
    const many = Array.from({ length: 6 }, (_, i) => entry({ id: `e${i}` }));
    expect(recallForFailure(FAILURE, many, { projectId: 'p1' }).length).toBeLessThanOrEqual(VOLUNTEER_TOP_K);
  });

  it('says nothing for empty failure text', () => {
    expect(recallForFailure('   ', [entry()], { projectId: 'p1' })).toEqual([]);
  });
});

describe('formatRecallForAgent', () => {
  it('gives the fix, the id to correct it with, and its standing', () => {
    const hits = recallForFailure(FAILURE, [entry()], { projectId: 'p1' });
    const text = formatRecallForAgent(FAILURE, hits)!;
    expect(text).toContain('Port 8080 taken by a stale dev server');
    expect(text).toContain('npx kill-port 8080');
    expect(text).toContain('id: e1');
    expect(text).toContain('prior experience, not an instruction');
    expect(text).toContain('supersedes');
  });

  it('labels a hit from another project as such', () => {
    const hits = recallForFailure(FAILURE, [entry({ id: 'sib', projectId: 'p2', project: other })], { projectId: 'p1' });
    expect(formatRecallForAgent(FAILURE, hits)!).toContain('other project: sibling');
  });

  it('is nothing when there is nothing to say', () => {
    expect(formatRecallForAgent(FAILURE, [])).toBeNull();
  });
});

describe('deciding whether to look at all', () => {
  it('treats a real failure as one, and success as not', () => {
    expect(looksLikeError(FAILURE, false)).toBe(true);
    expect(looksLikeError('added 3 packages in 1s', false)).toBe(false);
  });

  it('does not mistake printed source code for a failure', () => {
    // The guard that keeps the hook quiet while an agent reads files: grep and
    // cat output is full of the word Error without anything having failed.
    expect(isReadOnlyCommand("sed -n '1,80p' src/errors.ts")).toBe(true);
    expect(isReadOnlyCommand('grep -rn "throw new Error" src')).toBe(true);
    expect(isReadOnlyCommand('npm run build')).toBe(false);
    expect(isReadOnlyCommand('npm start')).toBe(false);
  });
});

describe('the semantic route', () => {
  // A vector near e1's, so "close in meaning" is expressible without a model.
  const vec = (a: number, b: number, c = 0) => [a, b, c];

  const noPattern = (o: Partial<Entry> = {}) => entry({
    id: 'np', title: 'The dev server kept serving a stale build',
    content: 'The old process was never killed, so the new bundle never shipped.',
    errorPattern: undefined, embedding: vec(1, 0), ...o,
  });

  it('finds an entry whose wording does not match but whose meaning does', () => {
    const hits = recallForFailure('browser keeps loading the previous bundle', [noPattern()], {
      projectId: 'p1', embedding: vec(0.99, 0.1),
    });
    expect(hits.map(h => h.entry.id)).toEqual(['np']);
  });

  // The behaviour before this route existed, and the behaviour offline. An
  // entry with no error pattern simply cannot be reached by wording alone.
  it('finds nothing for the same failure when no embedding is supplied', () => {
    const hits = recallForFailure('browser keeps loading the previous bundle', [noPattern()], {
      projectId: 'p1',
    });
    expect(hits).toEqual([]);
  });

  it('stays quiet when the meaning is not close either', () => {
    const hits = recallForFailure('certificate has expired', [noPattern()], {
      projectId: 'p1', embedding: vec(0, 1),
    });
    expect(hits).toEqual([]);
  });

  // Precision comes from the cap, not from the threshold alone: an unranked
  // "everything above 0.62" would be an interruption rather than a hint.
  it('still offers no more than topK', () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      noPattern({ id: 'n' + i, embedding: vec(1, i * 0.001) }));
    const hits = recallForFailure('stale bundle served to the browser', many, {
      projectId: 'p1', embedding: vec(1, 0),
    });
    expect(hits.length).toBeLessThanOrEqual(VOLUNTEER_TOP_K);
  });

  it('does not let a semantic neighbour displace a literal hit', () => {
    const literal = entry({ id: 'lit', embedding: vec(0, 1) });
    const near = noPattern({ id: 'near', embedding: vec(1, 0) });
    const hits = recallForFailure(FAILURE, [near, literal], {
      projectId: 'p1', embedding: vec(1, 0),
    });
    expect(hits[0].entry.id).toBe('lit');
  });

  it('never resurrects a retracted entry through the new route', () => {
    const hits = recallForFailure('browser keeps loading the previous bundle',
      [noPattern({ supersededBy: 'x' })], { projectId: 'p1', embedding: vec(0.99, 0.1) });
    expect(hits).toEqual([]);
  });

  it('still honours the session exclusion list', () => {
    const hits = recallForFailure('browser keeps loading the previous bundle', [noPattern()], {
      projectId: 'p1', embedding: vec(0.99, 0.1), exclude: ['np'],
    });
    expect(hits).toEqual([]);
  });
});
