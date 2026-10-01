/**
 * Tests for agent-driven backfill: what past work is handed to the agent, and
 * how it is presented.
 *
 * A batch must show enough of each commit to judge it without flooding the
 * agent, skip session stretches with nothing to learn or already saved, and
 * never claim something was marked reviewed when it was only previewed.
 */

import { describe, it, expect } from 'vitest';
import { commitExcerpt, nextSessionChunk, formatBackfillBatch } from './backfill';
import type { CommitInfo } from './types';

const commit = (o: Partial<CommitInfo> = {}): CommitInfo => ({
  hash: 'abcdef1234567890',
  message: 'fix(mcp): lazy-load the ADK so the stdio handshake answers in time',
  timestamp: Date.UTC(2026, 8, 30),
  diff: ' packages/mcp/src/index.ts | 4 ++--\n 1 file changed\n\n-import { runAgent } from \'./agent\';\n+// loaded on demand',
  ...o,
});

let n = 0;
const user = (text: string) => JSON.stringify({ type: 'user', message: { content: text } });
function tool(name: string, input: Record<string, unknown>, output: string, isError = false): string {
  const id = `t${++n}`;
  return [
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } }),
    JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: output, is_error: isError }] } }),
  ].join('\n');
}
const jsonl = (...lines: string[]) => lines.join('\n') + '\n';
const failing = tool('Bash', { command: 'npm start' }, 'Error: listen EADDRINUSE: address already in use :::8080', true);
const edit = tool('Edit', { file_path: '/repo/server.ts' }, 'ok');

describe('commitExcerpt', () => {
  it('shows the message, date, files and diff', () => {
    const text = commitExcerpt(commit());
    expect(text).toContain('commit abcdef1234 · 2026-09-30');
    expect(text).toContain('lazy-load the ADK');
    expect(text).toContain('1 file changed');
    expect(text).toContain('+// loaded on demand');
  });

  it('truncates a large diff and says how to see the rest', () => {
    const big = commit({ diff: ` a.ts | 900 +\n\n${'+x\n'.repeat(2000)}` });
    const text = commitExcerpt(big, 500);
    expect(text.length).toBeLessThan(1000);
    expect(text).toContain('git show abcdef1234');
  });
});

describe('nextSessionChunk', () => {
  it('hands over a stretch where something was fixed', () => {
    const t = jsonl(user('the server will not start'), failing, edit);
    const chunk = nextSessionChunk(t, 0);
    expect(chunk.digest).toContain('EADDRINUSE');
    expect(chunk.toLine).toBe(5);
  });

  it('skips a session with nothing to learn, and lets it go', () => {
    const t = jsonl(user('where is the config?'), tool('Read', { file_path: '/repo/a.ts' }, 'code'));
    expect(nextSessionChunk(t, 0)).toEqual({ digest: null, toLine: 3 });
  });

  it('skips a stretch the agent already saved at the time', () => {
    const t = jsonl(failing, edit, tool('mcp__devbrain__save_entry', { title: 'Port 8080 already in use' }, 'saved'));
    expect(nextSessionChunk(t, 0).digest).toBeNull();
  });

  it('reads from the cursor, so a handed-over stretch is not handed over again', () => {
    const t = jsonl(failing, edit);
    const first = nextSessionChunk(t, 0);
    expect(nextSessionChunk(t, first.toLine).digest).toBeNull();
  });
});

describe('formatBackfillBatch', () => {
  const batch = {
    project: 'devbrain', commits: [commit()], sessions: [{ sessionId: '0e466c23-aaaa', digest: 'ERROR: EADDRINUSE' }],
    remainingCommits: 12, remainingSessions: 1, markedReviewed: true,
  };

  it('tells the agent what to do and how to write it', () => {
    const text = formatBackfillBatch(batch);
    expect(text).toContain('save_entry');
    expect(text).toContain('error_pattern');
    expect(text).toContain('skip version bumps');
  });

  it('includes the commits and the session evidence', () => {
    const text = formatBackfillBatch(batch);
    expect(text).toContain('## Commits');
    expect(text).toContain('### session 0e466c23');
    expect(text).toContain('ERROR: EADDRINUSE');
  });

  it('says what is left, or that history is done', () => {
    expect(formatBackfillBatch(batch)).toContain('Still unreviewed: 12 commits and 1 session');
    expect(formatBackfillBatch({ ...batch, remainingCommits: 0, remainingSessions: 0 })).toContain('fully reviewed');
  });

  it('does not claim a preview was marked reviewed', () => {
    expect(formatBackfillBatch(batch)).toContain('now marked reviewed');
    expect(formatBackfillBatch({ ...batch, markedReviewed: false })).toContain('Preview only');
  });
});
