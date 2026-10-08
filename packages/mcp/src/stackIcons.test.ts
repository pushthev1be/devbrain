/**
 * Tests that every stack label the detector can produce has a mark.
 *
 * The point is not the icons — it is that nothing used to say when one was
 * missing. The first version of this table was written by hand and was already
 * missing tRPC, GraphQL and Socket.io on the day it was written; the only
 * symptom was a mark that quietly did not appear, on a project nobody had open.
 *
 * So the generated file is checked against ALL_STACK_LABELS rather than against
 * itself. Add a framework to detectStack, forget to run `npm run icons`, and
 * this fails by name.
 */

import { describe, it, expect } from 'vitest';
import { ALL_STACK_LABELS } from '@devbrain/core';
import { STACK_ICONS } from './stackIcons';

/**
 * Labels Simple Icons genuinely has no logo for.
 *
 * Empty today. A label belongs here only when the package has nothing, never
 * to silence a regeneration that was not run.
 */
const NO_MARK: readonly string[] = [];

describe('stack icons', () => {
  it('covers every label the detector can produce', () => {
    const missing = ALL_STACK_LABELS.filter(l => !STACK_ICONS[l] && !NO_MARK.includes(l));
    expect(missing, `run \`npm run icons\` — no mark for: ${missing.join(', ')}`).toEqual([]);
  });

  // A mark keyed by anything other than the exact detector label can never be
  // looked up, and would sit in the file looking correct forever.
  it('has no mark keyed to a label the detector never emits', () => {
    const orphans = Object.keys(STACK_ICONS).filter(k => !ALL_STACK_LABELS.includes(k));
    expect(orphans).toEqual([]);
  });

  it('gives each mark a real path and a real colour', () => {
    for (const [label, icon] of Object.entries(STACK_ICONS)) {
      expect(icon.d, label).toMatch(/^<path d="[^"]+"\/>$/);
      expect(icon.color, label).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('assigns every mark one of the known roles, since the role orders the row', () => {
    const roles = new Set(['lang', 'frontend', 'backend', 'data', 'build']);
    for (const [label, icon] of Object.entries(STACK_ICONS)) {
      expect(roles.has(icon.role), `${label} has role "${icon.role}"`).toBe(true);
    }
  });

  // The two projects this is looked at on, so the common case is covered by
  // name rather than only in aggregate.
  it('covers the stacks actually detected here', () => {
    for (const label of ['Node.js', 'TypeScript', 'React', 'Tailwind CSS', 'Vite']) {
      expect(STACK_ICONS[label], label).toBeDefined();
    }
  });
});
