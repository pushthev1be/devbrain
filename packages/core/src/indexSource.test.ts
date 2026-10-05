/**
 * Tests for indexing a Markdown file as a source of truth.
 *
 * The point of indexing rather than absorbing is that the file stays
 * authoritative and DevBrain never holds a second, diverging copy. That property
 * only holds if reconciliation is exact: an unchanged file must produce no
 * writes, an edited section must update exactly one entry, and a deleted section
 * must retract its entry rather than leave it to be recalled as current.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdownSource, planIndex, entryForSection } from './indexSource';
import type { Entry, Project } from './types';

const project: Project = {
  id: 'p1', name: 'demo', path: '/repo', stack: [], createdAt: 1, lastSeen: 1,
};

const DOC = `# Engineering Bible

## Non-Negotiable Rules

1. Never commit without explicit approval. Staging is fine; committing is not.
2. Never deploy without approval, it is destructive to live users.

## Critical Bugs Fixed (Don't Reintroduce)

### 9. settle-props: upsert NOT NULL violation (v1.5)
**Problem**: upsert with a partial column set fails — Postgres requires all NOT NULL columns on the INSERT path.
**Fix**: Use individual update().eq() calls instead of upsert.
**Where**: settle-props/index.ts, step 6.

### 10. calibrationBias Never Applied
**Problem**: The bias field was read but never multiplied into the final lambda value anywhere.
**Fix**: Apply it in deriveLambdas() before the Poisson draw.

## Architecture Overview

### Data Flow (Match Predictions)
Fixtures arrive from the scheduler, are enriched, then scored by the prediction engine before caching.
`;

function sections() { return parseMarkdownSource(DOC); }

describe('parsing', () => {
  it('makes one section per heading that carries content', () => {
    const titles = sections().map(s => s.title);
    expect(titles).toContain('Non-Negotiable Rules');
    expect(titles).toContain('settle-props: upsert NOT NULL violation (v1.5)');
    expect(titles).toContain('Data Flow (Match Predictions)');
  });

  it('skips headings that only introduce sub-headings', () => {
    // "Critical Bugs Fixed" has no body of its own, only children.
    expect(sections().map(s => s.title)).not.toContain("Critical Bugs Fixed (Don't Reintroduce)");
  });

  it('strips the list number so the title reads as the thing', () => {
    expect(sections().find(s => /settle-props/.test(s.title))!.title)
      .toBe('settle-props: upsert NOT NULL violation (v1.5)');
  });

  it('folds Problem and Fix into a body an agent can act on', () => {
    const body = sections().find(s => /settle-props/.test(s.title))!.body;
    expect(body).toMatch(/Postgres requires all NOT NULL columns/);
    expect(body).toMatch(/Fix: Use individual update/);
  });

  it('captures Where as the place the knowledge lives', () => {
    expect(sections().find(s => /settle-props/.test(s.title))!.where)
      .toMatch(/settle-props\/index\.ts/);
  });

  it('classifies from the parent heading, not the wording of the title', () => {
    // "calibrationBias Never Applied" sits under Critical Bugs Fixed. Reading the
    // title first classified it as an anti-pattern because it contains "Never",
    // which would tell agents to avoid doing the very thing that fixed it.
    expect(sections().find(s => /calibrationBias/.test(s.title))!.type).toBe('fix');
    expect(sections().find(s => s.title === 'Non-Negotiable Rules')!.type).toBe('anti-pattern');
    expect(sections().find(s => /Data Flow/.test(s.title))!.type).toBe('architecture');
  });

  it('gives every section a unique anchor', () => {
    const anchors = sections().map(s => s.anchor);
    expect(new Set(anchors).size).toBe(anchors.length);
  });

  it('hashes the body, so an unchanged section is recognisable', () => {
    const a = sections().find(s => /settle-props/.test(s.title))!;
    const b = parseMarkdownSource(DOC).find(s => /settle-props/.test(s.title))!;
    expect(a.hash).toBe(b.hash);
  });
});

// ── reconciliation: the property that stops the two stores drifting ──────────

function indexed(section: ReturnType<typeof sections>[number], id = 'e1'): Entry {
  return entryForSection(section, project, 'CLAUDE.md', { id });
}

describe('planIndex', () => {
  it('treats everything as new on a first run', () => {
    const plan = planIndex(sections(), [], 'CLAUDE.md');
    expect(plan.added).toHaveLength(sections().length);
    expect(plan.updated).toHaveLength(0);
    expect(plan.removed).toHaveLength(0);
  });

  it('writes nothing when the file has not changed', () => {
    const existing = sections().map((s, i) => indexed(s, `e${i}`));
    const plan = planIndex(sections(), existing, 'CLAUDE.md');
    expect(plan.added).toHaveLength(0);
    expect(plan.updated).toHaveLength(0);
    expect(plan.removed).toHaveLength(0);
    expect(plan.unchanged).toBe(sections().length);
  });

  it('updates exactly the section that changed', () => {
    const existing = sections().map((s, i) => indexed(s, `e${i}`));
    const edited = parseMarkdownSource(DOC.replace('Use individual update().eq() calls', 'Use a single update() naming every column'));
    const plan = planIndex(edited, existing, 'CLAUDE.md');
    expect(plan.added).toHaveLength(0);
    expect(plan.removed).toHaveLength(0);
    expect(plan.updated).toHaveLength(1);
    expect(plan.updated[0].section.title).toMatch(/settle-props/);
  });

  it('retracts a section that was deleted from the file', () => {
    const existing = sections().map((s, i) => indexed(s, `e${i}`));
    const trimmed = parseMarkdownSource(DOC.replace(/### 10\. calibrationBias[\s\S]*?(?=\n## )/, ''));
    const plan = planIndex(trimmed, existing, 'CLAUDE.md');
    expect(plan.removed).toHaveLength(1);
    expect(plan.removed[0].title).toMatch(/calibrationBias/);
  });

  it('adds a section that appeared in the file', () => {
    const existing = sections().map((s, i) => indexed(s, `e${i}`));
    const grown = parseMarkdownSource(DOC + '\n### 11. New bug\n**Problem**: something else broke in a way worth recording.\n**Fix**: do the other thing instead.\n');
    const plan = planIndex(grown, existing, 'CLAUDE.md');
    expect(plan.added).toHaveLength(1);
    expect(plan.added[0].title).toBe('New bug');
  });

  it('ignores entries captured from work, and entries from other files', () => {
    const captured = { ...indexed(sections()[0], 'captured'), source: undefined } as Entry;
    const otherFile = { ...indexed(sections()[0], 'other') } as Entry;
    otherFile.source = { ...otherFile.source!, file: 'NOTES.md' };
    const plan = planIndex(sections(), [captured, otherFile], 'CLAUDE.md');
    // Neither counts as a derived entry for CLAUDE.md, so nothing is retracted.
    expect(plan.removed).toHaveLength(0);
    expect(plan.added).toHaveLength(sections().length);
  });

  it('does not re-retract an entry already superseded', () => {
    const existing = sections().map((s, i) => ({ ...indexed(s, `e${i}`), supersededBy: 'x' }));
    const plan = planIndex([], existing, 'CLAUDE.md');
    expect(plan.removed).toHaveLength(0);
  });
});

describe('entryForSection', () => {
  it('records where the entry came from, so it can be reconciled later', () => {
    const e = indexed(sections()[0]);
    expect(e.source!.file).toBe('CLAUDE.md');
    expect(e.source!.anchor).toBeTruthy();
    expect(e.source!.hash).toBeTruthy();
    expect(e.source!.heading).toContain('>');
  });

  it('tags derived entries so they are distinguishable from captured work', () => {
    expect(indexed(sections()[0]).tags).toContain('claude-md');
  });

  it('keeps the original createdAt when re-indexing an edited section', () => {
    const s = sections()[0];
    const e = entryForSection(s, project, 'CLAUDE.md', { id: 'e1', createdAt: 12345 });
    expect(e.createdAt).toBe(12345);
  });
});
