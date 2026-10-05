/**
 * Tests for the entry-type registry and the project dossier.
 *
 * The registry exists to stop one specific class of bug: an entry type that is
 * saveable but reachable from nowhere. Before it, `note` (the default for any
 * unprefixed save) and `solution` matched no branch in buildContext, so those
 * entries were stored and then never shown again. The invariants below are what
 * make that structurally impossible rather than merely fixed once.
 */

import { describe, it, expect } from 'vitest';
import type { Entry, Project } from './types';
import {
  ENTRY_TYPES, ENTRY_SECTIONS, ENTRY_TYPE_NAMES, DIFF_ENTRY_TYPES, SECTION_META,
  normalizeType, sectionFor, entryTypeSpec,
} from './types';
import { buildDossier, formatDossierMarkdown, dossierFiles } from './dossier';
import { buildContext } from './search';

// ── helpers ───────────────────────────────────────────────────────────────────

const project: Project = {
  id: 'p1', name: 'demo', path: '/repo/demo', stack: ['Node.js', 'TypeScript'],
  createdAt: 1000, lastSeen: 2000,
};

function entry(type: string, overrides: Partial<Entry> = {}): Entry {
  return {
    id: `e-${type}-${overrides.id ?? ''}`, projectId: 'p1',
    type: type as Entry['type'],
    title: `${type} title`, content: `${type} content`,
    tags: [], createdAt: 1000, confidence: 'observation', ...overrides,
  } as Entry;
}

// ── registry invariants ───────────────────────────────────────────────────────

describe('entry type registry', () => {
  it('gives every type a section — nothing can be stored yet unreachable', () => {
    for (const spec of ENTRY_TYPES) {
      expect(ENTRY_SECTIONS).toContain(spec.section);
    }
  });

  it('declares every section it uses in SECTION_META', () => {
    for (const section of ENTRY_SECTIONS) {
      expect(SECTION_META[section]).toBeDefined();
      expect(SECTION_META[section].heading.length).toBeGreaterThan(0);
      expect(SECTION_META[section].file).toMatch(/\.md$/);
    }
  });

  it('has no duplicate type names', () => {
    expect(new Set(ENTRY_TYPE_NAMES).size).toBe(ENTRY_TYPE_NAMES.length);
  });

  it('never lets an alias collide with a canonical type', () => {
    const canonical = new Set(ENTRY_TYPE_NAMES);
    for (const spec of ENTRY_TYPES) {
      for (const alias of spec.aliases ?? []) expect(canonical.has(alias)).toBe(false);
    }
  });

  it('allows a commit diff to produce more than bug/fix/note', () => {
    // The old extractKnowledge cap meant a commit could never record a decision,
    // pattern or anti-pattern no matter what the diff showed.
    expect(DIFF_ENTRY_TYPES).toContain('decision');
    expect(DIFF_ENTRY_TYPES).toContain('pattern');
    expect(DIFF_ENTRY_TYPES).toContain('anti-pattern');
  });

  it('excludes attachments from diff extraction', () => {
    expect(DIFF_ENTRY_TYPES).not.toContain('image');
  });
});

describe('normalizeType', () => {
  it('maps the legacy solution type onto fix', () => {
    expect(normalizeType('solution')).toBe('fix');
    expect(sectionFor('solution')).toBe('issues');
  });

  it('leaves canonical types untouched', () => {
    for (const name of ENTRY_TYPE_NAMES) expect(normalizeType(name)).toBe(name);
  });

  it('routes an unrecognised type to notes rather than dropping it', () => {
    // Forward compatibility: an entry written by a newer version must still be
    // findable by an older one.
    expect(normalizeType('quantum-insight')).toBe('note');
    expect(sectionFor('quantum-insight')).toBe('notes');
  });

  it('exposes a hint for every type, for forms and agent instructions', () => {
    for (const name of ENTRY_TYPE_NAMES) {
      expect(entryTypeSpec(name).hint.length).toBeGreaterThan(10);
    }
  });
});

// ── the regression that motivated all this ────────────────────────────────────

describe('buildContext reaches every type', () => {
  it('surfaces a note, which previously matched no section', () => {
    const entries = [{ ...entry('note', { title: 'unprefixed but important' }), project }];
    const ctx = buildContext(entries as never, project, undefined, undefined);
    expect(ctx.notes.map(r => r.entry.title)).toContain('unprefixed but important');
  });

  it('surfaces a legacy solution entry under issues', () => {
    const entries = [{ ...entry('solution', { title: 'restart the pod' }), project }];
    const ctx = buildContext(entries as never, project, undefined, undefined);
    expect(ctx.issues.map(r => r.entry.title)).toContain('restart the pod');
  });

  it('places every canonical type into some non-empty section', () => {
    const entries = ENTRY_TYPES.map((spec, i) => ({
      ...entry(spec.type, { id: String(i), title: `${spec.type} entry` }),
      project,
    }));
    const ctx = buildContext(entries as never, project, undefined, undefined);

    const placed = new Set<string>([
      ...ctx.issues, ...ctx.decisions, ...ctx.architecture, ...ctx.patterns,
      ...ctx.antiPatterns, ...ctx.stacks, ...ctx.notes,
    ].map(r => r.entry.title));

    // Attachments are deliberately not injected into an LLM context block, but
    // every other type must appear somewhere.
    for (const spec of ENTRY_TYPES) {
      if (spec.section === 'attachments') continue;
      expect(placed).toContain(`${spec.type} entry`);
    }
  });
});

// ── dossier ───────────────────────────────────────────────────────────────────

describe('buildDossier', () => {
  it('accounts for every entry — section counts sum to the total', () => {
    const entries = ENTRY_TYPES.map((spec, i) => entry(spec.type, { id: String(i) }));
    const d = buildDossier(project, entries);
    const summed = Object.values(d.counts).reduce((a, b) => a + b, 0);
    expect(d.total).toBe(entries.length);
    expect(summed).toBe(entries.length);
  });

  it('ignores entries belonging to other projects', () => {
    const d = buildDossier(project, [entry('fix'), entry('bug', { projectId: 'other' })]);
    expect(d.total).toBe(1);
  });

  it('omits empty sections but keeps declared order', () => {
    const d = buildDossier(project, [entry('note'), entry('fix'), entry('decision')]);
    expect(d.sections.map(s => s.section)).toEqual(['issues', 'decisions', 'notes']);
  });

  it('orders entries newest first within a section', () => {
    const d = buildDossier(project, [
      entry('fix', { id: 'old', title: 'old fix', createdAt: 100 }),
      entry('fix', { id: 'new', title: 'new fix', createdAt: 900 }),
    ]);
    expect(d.sections[0].entries.map(e => e.title)).toEqual(['new fix', 'old fix']);
  });

  it('reports the activity window and superseded count', () => {
    const d = buildDossier(project, [
      entry('fix', { id: 'a', createdAt: 100 }),
      entry('decision', { id: 'b', createdAt: 900, supersededBy: 'x' }),
    ]);
    expect(d.firstEntryAt).toBe(100);
    expect(d.lastEntryAt).toBe(900);
    expect(d.supersededCount).toBe(1);
  });

  it('handles a project with no entries', () => {
    const d = buildDossier(project, []);
    expect(d.total).toBe(0);
    expect(d.sections).toEqual([]);
  });
});

describe('formatDossierMarkdown', () => {
  it('leads with identity and stack', () => {
    const md = formatDossierMarkdown(buildDossier(project, [entry('fix')]));
    expect(md).toContain('# demo');
    expect(md).toContain('Node.js · TypeScript');
    expect(md).toContain('/repo/demo');
  });

  it('renders a legacy solution entry as fix', () => {
    const md = formatDossierMarkdown(buildDossier(project, [entry('solution')]));
    expect(md).toContain('`fix`');
    expect(md).not.toContain('`solution`');
  });

  it('includes error pattern and root-cause archetype when present', () => {
    const md = formatDossierMarkdown(buildDossier(project, [
      entry('bug', { errorPattern: 'MongoServerError: bad auth', causeArchetype: 'config divergence' }),
    ]));
    expect(md).toContain('MongoServerError: bad auth');
    expect(md).toContain('config divergence');
  });

  it('says what to do when a project is empty instead of rendering a bare header', () => {
    const md = formatDossierMarkdown(buildDossier(project, []));
    expect(md).toMatch(/devbrain backfill/);
  });

  it('never leaves a run of blank lines', () => {
    const md = formatDossierMarkdown(buildDossier(project, ENTRY_TYPES.map((s, i) => entry(s.type, { id: String(i) }))));
    expect(md).not.toMatch(/\n{3}/);
  });
});

describe('dossierFiles', () => {
  it('writes a README index plus one file per non-empty section', () => {
    const files = dossierFiles(buildDossier(project, [entry('fix'), entry('decision'), entry('note')]));
    expect(files.map(f => f.path)).toEqual(['README.md', 'issues.md', 'decisions.md', 'notes.md']);
  });

  it('links every section file from the index', () => {
    const d = buildDossier(project, [entry('fix'), entry('anti-pattern')]);
    const files = dossierFiles(d);
    const readme = files.find(f => f.path === 'README.md')!.contents;
    for (const s of d.sections) expect(readme).toContain(`(${s.file})`);
  });

  it('links each section file back to the index', () => {
    const files = dossierFiles(buildDossier(project, [entry('fix')]));
    expect(files.find(f => f.path === 'issues.md')!.contents).toContain('(README.md)');
  });

  it('still produces an index for an empty project', () => {
    const files = dossierFiles(buildDossier(project, []));
    expect(files.map(f => f.path)).toEqual(['README.md']);
  });

  it('puts every entry in exactly one file', () => {
    const entries = ENTRY_TYPES.map((s, i) => entry(s.type, { id: String(i), title: `unique-${s.type}` }));
    const files = dossierFiles(buildDossier(project, entries));
    const body = files.filter(f => f.path !== 'README.md').map(f => f.contents).join('\n');
    for (const spec of ENTRY_TYPES) {
      const hits = body.split(`unique-${spec.type}`).length - 1;
      expect(hits).toBe(1);
    }
  });
});
