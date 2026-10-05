/**
 * Tests for the edges between entries.
 *
 * The thing worth guarding is that the `fixes` offer stays narrow. A hint that
 * lists bugs the agent cannot recognise — closed ones, ones from other
 * sessions, ones already corrected — is a hint that gets skimmed and ignored,
 * and then the field stays empty exactly the way error_pattern did.
 */

import { describe, it, expect } from 'vitest';
import { openBugsInSession } from './graph';
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
