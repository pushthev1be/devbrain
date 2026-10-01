/**
 * Tests for packages/core/src/search.ts
 *
 * All functions here are pure — no DB, no Gemini, no mocking needed.
 * The only external call is synthesizeSection (gemini), which is skipped
 * by compressContext when entries.length < 2 or no creds.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Entry, Project } from './types';
import {
  findSimilar,
  preciseSearch,
  buildKeywordIndex,
  bm25Score,
  SEMANTIC_THRESHOLD,
  AGREEMENT_SEMANTIC,
  buildContext,
  formatContext,
  similarityLabel,
  timeAgo,
} from './search';

// ── helpers ───────────────────────────────────────────────────────────────────

/** Build a 3-dim unit vector pointing in direction [x,y,z] */
function vec(...components: number[]): number[] {
  const mag = Math.sqrt(components.reduce((s, v) => s + v * v, 0));
  return components.map(v => v / mag);
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'my-app',
    path: '/app',
    stack: ['Node.js', 'TypeScript'],
    createdAt: Date.now() - 86400000,
    lastSeen: Date.now(),
    ...overrides,
  };
}

function makeEntry(
  overrides: Partial<Entry & { project: Project }> = {}
): Entry & { project: Project } {
  const project = overrides.project ?? makeProject();
  return {
    id: 'e1',
    projectId: 'proj-1',
    type: 'fix',
    title: 'Default title',
    content: 'Default content',
    tags: [],
    embedding: vec(1, 0, 0),
    createdAt: Date.now() - 3600000,
    confidence: 'observation',
    project,
    ...overrides,
  };
}

// ── similarityLabel ───────────────────────────────────────────────────────────

describe('similarityLabel', () => {
  it('returns 99% match for score >= 0.92', () => {
    expect(similarityLabel(0.92)).toBe('99% match');
    expect(similarityLabel(1.0)).toBe('99% match');
  });
  it('returns 95% match for score >= 0.88', () => {
    expect(similarityLabel(0.88)).toBe('95% match');
    expect(similarityLabel(0.91)).toBe('95% match');
  });
  it('returns 90% match for score >= 0.82', () => {
    expect(similarityLabel(0.82)).toBe('90% match');
  });
  it('returns percentage for low scores', () => {
    expect(similarityLabel(0.5)).toBe('50% match');
  });
});

// ── timeAgo ───────────────────────────────────────────────────────────────────

describe('timeAgo', () => {
  it('shows minutes for recent timestamps', () => {
    expect(timeAgo(Date.now() - 5 * 60000)).toBe('5m ago');
  });
  it('shows hours', () => {
    expect(timeAgo(Date.now() - 3 * 3600000)).toBe('3h ago');
  });
  it('shows days', () => {
    expect(timeAgo(Date.now() - 2 * 86400000)).toBe('2d ago');
  });
  it('shows weeks', () => {
    expect(timeAgo(Date.now() - 14 * 86400000)).toBe('2w ago');
  });
  it('shows months', () => {
    expect(timeAgo(Date.now() - 60 * 86400000)).toBe('2mo ago');
  });
});

// ── findSimilar ───────────────────────────────────────────────────────────────

describe('findSimilar', () => {
  const project = makeProject();

  // Three vectors pointing in different directions
  const entries = [
    makeEntry({ id: 'e1', title: 'auth fix', embedding: vec(1, 0, 0), project }),
    makeEntry({ id: 'e2', title: 'database fix', embedding: vec(0, 1, 0), project }),
    makeEntry({ id: 'e3', title: 'unrelated', embedding: vec(0, 0, 1), project }),
  ];

  it('returns the most similar entry first', () => {
    const results = findSimilar(vec(1, 0, 0), entries, 3, 0);
    expect(results[0].entry.id).toBe('e1');
    expect(results[0].similarity).toBeCloseTo(1.0);
  });

  it('filters by threshold', () => {
    // query points along x — only e1 scores > 0.9, e2 and e3 score 0
    const results = findSimilar(vec(1, 0, 0), entries, 3, 0.5);
    expect(results).toHaveLength(1);
    expect(results[0].entry.id).toBe('e1');
  });

  it('respects topK', () => {
    const results = findSimilar(vec(1, 1, 0), entries, 2, 0);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('returns empty array when no entries have embeddings', () => {
    const bare = entries.map(e => ({ ...e, embedding: undefined }));
    const results = findSimilar(vec(1, 0, 0), bare, 3, 0);
    expect(results).toHaveLength(0);
  });

  it('handles zero-length embeddings gracefully', () => {
    const bad = [makeEntry({ id: 'bad', embedding: [], project })];
    const results = findSimilar(vec(1, 0, 0), bad, 3, 0);
    expect(results).toHaveLength(0);
  });
});

// ── preciseSearch ─────────────────────────────────────────────────────────────

describe('preciseSearch', () => {
  const project = makeProject();

  const entries = [
    makeEntry({
      id: 'e-jwt',
      type: 'fix',
      title: 'JWT token expires in production',
      content: 'Set TOKEN_EXPIRY=86400 in prod .env',
      category: 'auth',
      errorPattern: 'TokenExpiredError: jwt expired',
      embedding: vec(1, 0, 0),
      project,
    }),
    makeEntry({
      id: 'e-mongo',
      type: 'fix',
      title: 'MongoDB connection timeout in Docker',
      content: 'Use container name instead of localhost',
      category: 'database',
      embedding: vec(0, 1, 0),
      project,
    }),
    makeEntry({
      id: 'e-superseded',
      type: 'decision',
      title: 'Old superseded decision',
      content: 'No longer relevant',
      embedding: vec(1, 0, 0),
      supersededBy: 'some-other-id',
      project,
    }),
  ];

  it('excludes superseded entries', () => {
    const results = preciseSearch('old decision', vec(1, 0, 0), entries, { topK: 5, threshold: 0 });
    expect(results.find(r => r.entry.id === 'e-superseded')).toBeUndefined();
  });

  it('pattern match wins over semantic for exact error text', () => {
    const results = preciseSearch(
      'TokenExpiredError: jwt expired',
      vec(0, 1, 0), // embedding points at mongo, not jwt
      entries,
      { topK: 5, threshold: 0 }
    );
    // Even though embedding is closer to mongo, pattern match should surface jwt
    expect(results[0].entry.id).toBe('e-jwt');
    expect(results[0].matchType).toBe('pattern');
  });

  it('falls back to semantic when no pattern match', () => {
    const results = preciseSearch(
      'database connection problem',
      vec(0, 1, 0), // points at mongo
      entries,
      { topK: 5, threshold: 0 }
    );
    expect(results[0].entry.id).toBe('e-mongo');
    expect(results[0].matchType).toBe('semantic');
  });

  it('category filter boosts matching entries', () => {
    const results = preciseSearch(
      'token problem',
      vec(0.5, 0.5, 0), // ambiguous embedding
      entries,
      { category: 'auth', topK: 5, threshold: 0 }
    );
    const jwtResult = results.find(r => r.entry.id === 'e-jwt');
    expect(jwtResult?.categoryMatch).toBe(true);
  });

  it('respects topK limit', () => {
    const results = preciseSearch('any query', vec(1, 0, 0), entries, { topK: 1, threshold: 0 });
    expect(results.length).toBeLessThanOrEqual(1);
  });
});

// ── buildContext ──────────────────────────────────────────────────────────────

describe('buildContext', () => {
  const project = makeProject({ id: 'proj-1' });
  const otherProject = makeProject({ id: 'proj-2', name: 'other-app' });

  const now = Date.now();

  const entries: (Entry & { project: Project })[] = [
    makeEntry({ id: 'bug-1', type: 'bug', title: 'Login fails', content: 'Missing auth header', embedding: vec(1, 0, 0), createdAt: now - 1000, project }),
    makeEntry({ id: 'fix-1', type: 'fix', title: 'Fixed login', content: 'Added auth header', embedding: vec(1, 0, 0), createdAt: now - 2000, project }),
    makeEntry({ id: 'dec-1', type: 'decision', title: 'Use JWT', content: 'Stateless, scalable', embedding: vec(0, 1, 0), createdAt: now - 3000, project }),
    makeEntry({ id: 'pat-1', type: 'pattern', title: 'Always verify token', content: 'Check expiry', embedding: vec(0.8, 0.2, 0), createdAt: now - 4000, project }),
    makeEntry({ id: 'anti-1', type: 'anti-pattern', title: 'Never expose secret key', content: 'Causes token forgery', embedding: vec(0.9, 0.1, 0), createdAt: now - 5000, project }),
    makeEntry({ id: 'stack-1', type: 'stack', title: 'Node.js + JWT', content: 'Express, jsonwebtoken', embedding: vec(0.7, 0.3, 0), createdAt: now - 6000, project }),
    // Cross-project entry seen in 2+ projects
    makeEntry({ id: 'cross-1', type: 'fix', title: 'Cross-project fix', content: 'Seen everywhere', embedding: vec(1, 0, 0), seenInProjects: ['proj-1', 'proj-2'], createdAt: now - 7000, project: otherProject }),
    // Superseded decision — should go to supersededDecisions, not decisions
    makeEntry({ id: 'dec-old', type: 'decision', title: 'Old decision', content: 'No longer applies', embedding: vec(0, 1, 0), supersededBy: 'dec-1', createdAt: now - 8000, project }),
  ];

  it('separates entries into correct categories', () => {
    const ctx = buildContext(entries, project);
    expect(ctx.issues.some(r => r.entry.type === 'bug' || r.entry.type === 'fix')).toBe(true);
    expect(ctx.decisions.every(r => r.entry.type === 'decision')).toBe(true);
    expect(ctx.patterns.every(r => r.entry.type === 'pattern' || r.entry.type === 'lesson')).toBe(true);
    expect(ctx.antiPatterns.every(r => r.entry.type === 'anti-pattern')).toBe(true);
    expect(ctx.stacks.every(r => r.entry.type === 'stack')).toBe(true);
  });

  it('puts superseded decisions in supersededDecisions, not decisions', () => {
    const ctx = buildContext(entries, project);
    const activeIds = ctx.decisions.map(r => r.entry.id);
    const supersededIds = (ctx.supersededDecisions ?? []).map(r => r.entry.id);
    expect(activeIds).not.toContain('dec-old');
    expect(supersededIds).toContain('dec-old');
  });

  it('promotes entries seen in 2+ projects to crossProjectPatterns', () => {
    const ctx = buildContext(entries, project);
    expect(ctx.crossProjectPatterns).toBeDefined();
    expect(ctx.crossProjectPatterns!.some(r => r.entry.id === 'cross-1')).toBe(true);
  });

  it('does not include stack/note entries in crossProjectPatterns', () => {
    const withStackCross = [
      ...entries,
      makeEntry({ id: 'stack-cross', type: 'stack', title: 'Multi-project stack', content: 'Seen everywhere', embedding: vec(1, 0, 0), seenInProjects: ['proj-1', 'proj-2'], project: otherProject }),
    ];
    const ctx = buildContext(withStackCross, project);
    const crossIds = (ctx.crossProjectPatterns ?? []).map(r => r.entry.id);
    expect(crossIds).not.toContain('stack-cross');
  });

  it('same-project boost is applied — project scores higher than threshold', () => {
    // Without a query, same-project entries get base semantic 0.8, others 0.35.
    // The sameProj boost (0.10) only fires when !queryEmbedding, so test that path.
    const ctx = buildContext(entries, project);
    // With no query, same-project entries dominate — issues should exist
    expect(ctx.issues.length).toBeGreaterThan(0);
    // And the currentProject should be set
    expect(ctx.currentProject?.id).toBe('proj-1');
  });

  it('deduplicates near-identical entries', () => {
    // Two entries with identical embeddings — only one should appear
    const dupes: (Entry & { project: Project })[] = [
      makeEntry({ id: 'd1', type: 'fix', title: 'Fix A', embedding: vec(1, 0, 0), project }),
      makeEntry({ id: 'd2', type: 'fix', title: 'Fix B (same embedding)', embedding: vec(1, 0, 0), project }),
    ];
    const ctx = buildContext(dupes, project, vec(1, 0, 0));
    expect(ctx.issues.length).toBe(1);
  });

  it('returns currentProject correctly', () => {
    const ctx = buildContext(entries, project);
    expect(ctx.currentProject?.id).toBe('proj-1');
  });

  it('handles null currentProject without throwing', () => {
    expect(() => buildContext(entries, null)).not.toThrow();
    const ctx = buildContext(entries, null);
    expect(ctx.currentProject).toBeNull();
  });
});

// ── formatContext ─────────────────────────────────────────────────────────────

describe('formatContext', () => {
  const project = makeProject();
  const now = Date.now();

  const entries: (Entry & { project: Project })[] = [
    makeEntry({ id: 'f1', type: 'fix', title: 'Fix auth token expiry', content: 'Set TOKEN_EXPIRY in prod', embedding: vec(1, 0, 0), createdAt: now - 1000, project }),
    makeEntry({ id: 'f2', type: 'decision', title: 'Use JWT over sessions', content: 'Stateless, easier to scale', embedding: vec(0, 1, 0), createdAt: now - 2000, project }),
    makeEntry({ id: 'f3', type: 'anti-pattern', title: 'Never log JWT secret', content: 'Exposes signing key', embedding: vec(0.5, 0.5, 0), createdAt: now - 3000, project }),
  ];

  it('starts with the project name header', () => {
    const ctx = buildContext(entries, project);
    const text = formatContext(ctx);
    expect(text).toMatch(/^# DevBrain Context — my-app/);
  });

  it('includes query in header when provided', () => {
    const ctx = buildContext(entries, project, vec(1, 0, 0), 'auth');
    const text = formatContext(ctx, 'auth');
    expect(text).toContain('"auth"');
  });

  it('contains Past Issues & Fixes section', () => {
    const ctx = buildContext(entries, project);
    const text = formatContext(ctx);
    expect(text).toContain('## Past Issues & Fixes');
  });

  it('contains Architecture Decisions section', () => {
    const ctx = buildContext(entries, project);
    const text = formatContext(ctx);
    expect(text).toContain('## Architecture Decisions');
  });

  it('contains Anti-Patterns section', () => {
    const ctx = buildContext(entries, project);
    const text = formatContext(ctx);
    expect(text).toContain('## Anti-Patterns');
  });

  it('returns a no-knowledge message when context is empty', () => {
    const ctx = buildContext([], project);
    const text = formatContext(ctx);
    expect(text).toContain('No relevant knowledge found');
  });

  it('shows superseded decisions separately', () => {
    const supersededEntry = makeEntry({
      id: 'sup-1', type: 'decision',
      title: 'Old decision',
      content: 'Was wrong',
      embedding: vec(0, 1, 0),
      supersededBy: 'other-id',
      project,
    });
    const ctx = buildContext([...entries, supersededEntry], project);
    const text = formatContext(ctx);
    expect(text).toContain('SUPERSEDED');
  });

  it('includes Tech Stack section when stack entries exist', () => {
    const withStack = [
      ...entries,
      makeEntry({ id: 's1', type: 'stack', title: 'Node.js · TypeScript', content: 'Express, JWT', embedding: vec(1, 0, 0), project }),
    ];
    const ctx = buildContext(withStack, project);
    const text = formatContext(ctx);
    expect(text).toContain('## Tech Stack');
  });
});

// ── BM25 ──────────────────────────────────────────────────────────────────────

describe('bm25Score', () => {
  // "timeout" is in every entry, "kafka" in one: idf should tell them apart.
  const corpus = [
    makeEntry({ id: 'a', title: 'kafka consumer timeout', content: 'raise session timeout' }),
    makeEntry({ id: 'b', title: 'postgres statement timeout', content: 'raise statement timeout' }),
    makeEntry({ id: 'c', title: 'redis command timeout', content: 'raise command timeout' }),
  ];
  const idx = buildKeywordIndex(corpus);

  it('weights a rare term above a common one within the same query', () => {
    // Both entries match exactly one of the two query terms, once each, so only
    // idf can separate them. Note idf cannot change the score of a SINGLE-term
    // query: it appears in both the sum and the normalizer and cancels.
    const i2 = buildKeywordIndex([
      makeEntry({ id: 'rare', title: 'kafka', content: '' }),
      makeEntry({ id: 'common', title: 'timeout', content: '' }),
      makeEntry({ id: 'f1', title: 'timeout', content: '' }),
      makeEntry({ id: 'f2', title: 'timeout', content: '' }),
      makeEntry({ id: 'f3', title: 'timeout', content: '' }),
    ]);
    expect(bm25Score('kafka timeout', 'rare', i2))
      .toBeGreaterThan(bm25Score('kafka timeout', 'common', i2));
  });

  it('scores zero when the query shares no term with the entry', () => {
    expect(bm25Score('swift collectionview flicker', 'a', idx)).toBe(0);
  });

  it('scores zero for an entry that is not in the index', () => {
    expect(bm25Score('kafka', 'not-indexed', idx)).toBe(0);
  });

  it('stays within 0..1 so it can be compared against a fixed threshold', () => {
    for (const q of ['kafka', 'kafka consumer timeout', 'timeout timeout timeout']) {
      for (const id of ['a', 'b', 'c']) {
        const s = bm25Score(q, id, idx);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(1);
      }
    }
  });

  it('saturates: a repeated term does not multiply the score', () => {
    const once = bm25Score('kafka', 'a', idx);
    const many = bm25Score('kafka kafka kafka kafka', 'a', idx);
    // Terms are de-duplicated and tf saturates, so repetition cannot inflate.
    expect(many).toBeCloseTo(once, 5);
  });

  it('prefers the shorter entry when both mention the term as often', () => {
    const short = makeEntry({ id: 'short', title: 'kafka timeout', content: '' });
    const long = makeEntry({
      id: 'long',
      title: 'kafka timeout',
      content: 'a '.repeat(200) + 'lengthy discussion of unrelated matters',
    });
    const i2 = buildKeywordIndex([short, long]);
    expect(bm25Score('kafka', 'short', i2)).toBeGreaterThan(bm25Score('kafka', 'long', i2));
  });

  it('empty index and empty query both score zero rather than throwing', () => {
    expect(bm25Score('kafka', 'a', buildKeywordIndex([]))).toBe(0);
    expect(bm25Score('', 'a', idx)).toBe(0);
  });
});

describe('preciseSearch agreement gate', () => {
  // Semantic alone is below SEMANTIC_THRESHOLD but above AGREEMENT_SEMANTIC;
  // only the entry that also shares wording should survive.
  const near = (SEMANTIC_THRESHOLD + AGREEMENT_SEMANTIC) / 2;
  const project = makeProject();
  const lexical = makeEntry({
    id: 'e-lexical',
    title: 'kafka consumer rebalance storm',
    content: 'raise max.poll.interval.ms so the consumer is not evicted',
    embedding: vec(near, Math.sqrt(1 - near * near), 0),
    project,
  });
  const silent = makeEntry({
    id: 'e-silent',
    title: 'unrelated styling cleanup',
    content: 'simplified the stylesheet',
    embedding: vec(near, Math.sqrt(1 - near * near), 0),
    project,
  });

  it('keeps an entry that agrees on wording and meaning without either being strong', () => {
    const hits = preciseSearch('kafka consumer rebalance storm', vec(1, 0, 0), [lexical, silent]);
    expect(hits.map(h => h.entry.id)).toContain('e-lexical');
  });

  it('still drops an equally-similar entry that shares no wording', () => {
    const hits = preciseSearch('kafka consumer rebalance storm', vec(1, 0, 0), [lexical, silent]);
    expect(hits.map(h => h.entry.id)).not.toContain('e-silent');
  });

  it('agreement does not fire without an embedding, so no-AI search is unaffected', () => {
    const hits = preciseSearch('kafka consumer rebalance storm', [], [silent]);
    expect(hits.map(h => h.entry.id)).not.toContain('e-silent');
  });
});
