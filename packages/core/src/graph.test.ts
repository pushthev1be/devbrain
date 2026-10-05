/**
 * Tests for the edges between entries.
 *
 * The thing worth guarding is that the `fixes` offer stays narrow. A hint that
 * lists bugs the agent cannot recognise — closed ones, ones from other
 * sessions, ones already corrected — is a hint that gets skimmed and ignored,
 * and then the field stays empty exactly the way error_pattern did.
 */

import { describe, it, expect } from 'vitest';
import { openBugsInSession, buildGraph, graphSubset } from './graph';
import { buildFixHint, buildRecordPrompt } from './turnReview';
import type { Entry } from './types';

let clock = 1_700_000_000_000;

function entry(partial: Partial<Entry> & { id: string }): Entry {
  return {
    projectId: 'p1',
    type: 'bug',
    title: `bug ${partial.id}`,
    content: 'something broke',
    tags: [],
    createdAt: (clock += 1000),
    ...partial,
  } as Entry;
}

describe('openBugsInSession', () => {
  it('offers a bug recorded in this session', () => {
    const open = openBugsInSession([entry({ id: 'a', sessionId: 's1' })], 's1');
    expect(open).toEqual([{ id: 'a', title: 'bug a' }]);
  });

  it('leaves out a bug another entry already closed', () => {
    const entries = [
      entry({ id: 'a', sessionId: 's1' }),
      entry({ id: 'b', sessionId: 's1', type: 'fix', fixes: 'a' }),
    ];
    expect(openBugsInSession(entries, 's1')).toEqual([]);
  });

  it('leaves out bugs from other sessions', () => {
    const entries = [entry({ id: 'a', sessionId: 's2' }), entry({ id: 'b' })];
    expect(openBugsInSession(entries, 's1')).toEqual([]);
  });

  it('leaves out a bug that was superseded — the claim itself was wrong', () => {
    const entries = [entry({ id: 'a', sessionId: 's1', supersededBy: 'z' })];
    expect(openBugsInSession(entries, 's1')).toEqual([]);
  });

  // A decision or a lesson is not something a fix closes, so offering one as a
  // `fixes` target would invite a link that means nothing.
  it('offers only bugs, not every entry in the session', () => {
    const entries = [
      entry({ id: 'a', sessionId: 's1', type: 'decision' }),
      entry({ id: 'b', sessionId: 's1', type: 'lesson' }),
      entry({ id: 'c', sessionId: 's1', type: 'bug' }),
    ];
    expect(openBugsInSession(entries, 's1').map(b => b.id)).toEqual(['c']);
  });

  it('puts the newest first — the bug in hand is the one just written down', () => {
    const entries = [
      entry({ id: 'old', sessionId: 's1' }),
      entry({ id: 'new', sessionId: 's1' }),
    ];
    expect(openBugsInSession(entries, 's1').map(b => b.id)).toEqual(['new', 'old']);
  });

  it('offers nothing when the session is unknown, rather than everything', () => {
    expect(openBugsInSession([entry({ id: 'a' })], '')).toEqual([]);
  });
});

describe('the fixes hint', () => {
  it('says nothing at all when no bug is open', () => {
    expect(buildFixHint([])).toEqual([]);
    expect(buildRecordPrompt([])).not.toContain('fixes');
  });

  it('names the id to pass, because the agent has to copy it verbatim', () => {
    const prompt = buildRecordPrompt([], [{ id: 'abc123', title: 'the thing broke' }]);
    expect(prompt).toContain('abc123');
    expect(prompt).toContain('`fixes`');
    expect(prompt).toContain('the thing broke');
  });

  // The hint competes with the rest of the prompt for attention. A long list
  // reads as a menu to skip rather than a question to answer.
  it('stops at three, however many are open', () => {
    const many = ['a', 'b', 'c', 'd', 'e'].map(id => ({ id, title: `bug ${id}` }));
    const lines = buildFixHint(many);
    expect(lines.filter(l => l.startsWith('  '))).toHaveLength(3);
    expect(lines.join('\n')).not.toContain('bug d');
  });
});

describe('buildGraph', () => {
  it('draws the fix over the bug it closed', () => {
    const { edges } = buildGraph([
      entry({ id: 'bug' }),
      entry({ id: 'fix', type: 'fix', fixes: 'bug' }),
    ]);
    expect(edges).toEqual([{ from: 'fix', to: 'bug', kind: 'fixes' }]);
  });

  // An edge to an id that is not in the set would be a line to nowhere — which
  // happens whenever the graph is filtered to one project or a recent window.
  it('ignores a link whose other end is not in the set', () => {
    const { edges } = buildGraph([entry({ id: 'fix', type: 'fix', fixes: 'elsewhere' })]);
    expect(edges).toEqual([]);
  });

  it('keeps a retracted entry in the graph, marked — the correction needs it to read against', () => {
    const { nodes } = buildGraph([
      entry({ id: 'wrong', supersededBy: 'right' }),
      entry({ id: 'right', supersedes: 'wrong' }),
    ]);
    expect(nodes.find(n => n.id === 'wrong')!.superseded).toBe(true);
    expect(nodes.find(n => n.id === 'right')!.superseded).toBe(false);
  });

  // Ten entries in a session is a thread of work. Every pair would be
  // forty-five lines through the same ten nodes, which reads as noise.
  it('threads a session in order rather than joining every pair', () => {
    const { edges } = buildGraph(['a', 'b', 'c', 'd'].map(id => entry({ id, sessionId: 's1' })));
    expect(edges).toHaveLength(3);
    expect(edges.map(e => [e.from, e.to])).toEqual([['a', 'b'], ['b', 'c'], ['c', 'd']]);
  });

  it('lets a recorded edge win the pair over an inferred one', () => {
    const { edges } = buildGraph([
      entry({ id: 'bug', sessionId: 's1' }),
      entry({ id: 'fix', type: 'fix', sessionId: 's1', fixes: 'bug' }),
    ]);
    expect(edges).toHaveLength(1);
    expect(edges[0].kind).toBe('fixes');
  });

  it('connects two entries that failed the same way', () => {
    const { edges } = buildGraph([
      entry({ id: 'a', errorPattern: "src/a.ts(3,1): error TS2304: Cannot find name 'tier'." }),
      entry({ id: 'b', errorPattern: "src/zz.ts(91,7): error TS2304: Cannot find name 'plan'." }),
    ]);
    expect(edges.map(e => e.kind)).toEqual(['same-error']);
    expect(edges[0].because).toContain('same error');
  });

  it('does not connect two unrelated errors', () => {
    const { edges } = buildGraph([
      entry({ id: 'a', errorPattern: 'TokenExpiredError: jwt expired' }),
      entry({ id: 'b', errorPattern: 'ECONNREFUSED 127.0.0.1:27017' }),
    ]);
    expect(edges).toEqual([]);
  });

  // "Exit code 1" reduces to almost nothing and would otherwise join every
  // failure to every other one.
  it('leaves a group too large to draw undrawn, rather than smearing the graph', () => {
    const many = Array.from({ length: 12 }, (_, i) => entry({ id: `e${i}`, causeArchetype: 'config drift' }));
    expect(buildGraph(many).edges).toEqual([]);
  });

  it('connects different symptoms that share a cause', () => {
    const { edges } = buildGraph([
      entry({ id: 'a', causeArchetype: 'Stale build artefact' }),
      entry({ id: 'b', causeArchetype: 'stale build artefact' }),
    ]);
    expect(edges.map(e => e.kind)).toEqual(['same-cause']);
  });

  it('orders nodes oldest first, so the picture reads as progression', () => {
    const late = entry({ id: 'late' });
    const early = entry({ id: 'early', createdAt: 1 });
    expect(buildGraph([late, early]).nodes.map(n => n.id)).toEqual(['early', 'late']);
  });
});

describe('graphSubset', () => {
  it('keeps the connected entries when it has to drop some', () => {
    const linked = [entry({ id: 'bug' }), entry({ id: 'fix', type: 'fix', fixes: 'bug' })];
    const lonely = Array.from({ length: 10 }, (_, i) => entry({ id: `lonely${i}` }));
    const kept = graphSubset([...linked, ...lonely], 3).map(e => e.id);
    expect(kept).toContain('bug');
    expect(kept).toContain('fix');
    expect(kept).toHaveLength(3);
  });

  it('leaves a small set alone', () => {
    expect(graphSubset([entry({ id: 'a' })], 120)).toHaveLength(1);
  });
});

describe('nearest-neighbour edges', () => {
  // A vector pointing mostly one way, so similarity is easy to reason about.
  function vec(x: number, y: number, z = 0): number[] { return [x, y, z]; }

  it('gives every entry a line to what it is most like', () => {
    const { edges } = buildGraph([
      entry({ id: 'a', embedding: vec(1, 0) }),
      entry({ id: 'b', embedding: vec(0.95, 0.3) }),
      entry({ id: 'c', embedding: vec(0.9, 0.44) }),
    ]);
    const touched = new Set(edges.flatMap(e => [e.from, e.to]));
    expect(touched).toEqual(new Set(['a', 'b', 'c']));
    expect(edges.every(e => e.kind === 'related')).toBe(true);
  });

  // The whole reason for nearest-k over a threshold: a threshold either
  // connects everything to everything or leaves entries with no line at all.
  it('names at most k neighbours, however many are near', () => {
    const many = Array.from({ length: 9 }, (_, i) => entry({ id: `e${i}`, embedding: vec(1, i * 0.01) }));
    const { edges } = buildGraph(many, { neighbours: 1 });
    // One per entry at most, and mutual pairs collapse to a single line.
    expect(edges.length).toBeLessThanOrEqual(many.length);
    expect(edges.length).toBeGreaterThan(0);
  });

  it('leaves two unrelated entries unconnected', () => {
    const { edges } = buildGraph([
      entry({ id: 'a', embedding: vec(1, 0) }),
      entry({ id: 'b', embedding: vec(0, 1) }),
    ]);
    expect(edges).toEqual([]);
  });

  it('says how near, so a weak line can be read as weak', () => {
    const { edges } = buildGraph([
      entry({ id: 'a', embedding: vec(1, 0) }),
      entry({ id: 'b', embedding: vec(0.95, 0.3) }),
    ]);
    expect(edges[0].because).toMatch(/closest in meaning \(\d+%\)/);
  });

  // A recorded link says something definite. "These two read alike" must never
  // be drawn over it.
  it('never takes a pair that a recorded edge already claimed', () => {
    const near = vec(1, 0.02);
    const { edges } = buildGraph([
      entry({ id: 'bug', embedding: vec(1, 0) }),
      entry({ id: 'fix', type: 'fix', fixes: 'bug', embedding: near }),
    ]);
    expect(edges).toHaveLength(1);
    expect(edges[0].kind).toBe('fixes');
  });

  it('can be turned off, for callers ranking rather than drawing', () => {
    const { edges } = buildGraph([
      entry({ id: 'a', embedding: vec(1, 0) }),
      entry({ id: 'b', embedding: vec(0.99, 0.1) }),
    ], { related: false });
    expect(edges).toEqual([]);
  });

  it('skips entries with no embedding rather than failing', () => {
    const { nodes, edges } = buildGraph([
      entry({ id: 'a', embedding: vec(1, 0) }),
      entry({ id: 'b' }),
    ]);
    expect(nodes).toHaveLength(2);
    expect(edges).toEqual([]);
  });

  // graphSubset decides which entries get drawn at all. If "related" counted,
  // everything would look equally connected and the cut would keep an isolated
  // note over the fix that closed a bug.
  it('does not let likeness outrank a recorded link when choosing what to draw', () => {
    const linked = [
      entry({ id: 'bug', createdAt: 1, embedding: vec(0, 1) }),
      entry({ id: 'fix', type: 'fix', fixes: 'bug', createdAt: 2, embedding: vec(0, 1) }),
    ];
    const alike = Array.from({ length: 8 }, (_, i) => entry({ id: `n${i}`, embedding: vec(1, i * 0.001) }));
    const kept = graphSubset([...linked, ...alike], 3).map(e => e.id);
    expect(kept).toContain('bug');
    expect(kept).toContain('fix');
  });
});
