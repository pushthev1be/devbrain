/**
 * Tests for reading an agent session transcript as evidence.
 *
 * The rules that matter: a failing command is kept verbatim (it is what a
 * future search will be matched against), file contents that merely mention
 * "Error" are not failures, harness noise is not the user speaking, and the
 * gate spends a model call only on stretches where something was worked out.
 */

import { describe, it, expect } from 'vitest';
import {
  parseTranscript, assessSegment, buildDigest, chunkEvents, errorExcerpt, looksLikeError, isEchoedOutput,
} from './transcript';
import type { DigestEvent } from './transcript';

let n = 0;
const user = (text: string) => JSON.stringify({ type: 'user', sessionId: 's1', cwd: '/repo', message: { role: 'user', content: text } });
const say = (text: string) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text }] } });
function tool(name: string, input: Record<string, unknown>, output: string, isError = false): string[] {
  const id = `t${++n}`;
  return [
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } }),
    JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: output, is_error: isError }] } }),
  ];
}
const jsonl = (...lines: (string | string[])[]) => lines.flat().join('\n') + '\n';

describe('parseTranscript', () => {
  it('keeps a failing command verbatim, with the command that produced it', () => {
    const t = jsonl(
      user('the build is broken'),
      tool('Bash', { command: 'npm run build' }, "src/a.ts(3,1): error TS2304: Cannot find name 'foo'.\nFound 1 error.", true),
    );
    const { events } = parseTranscript(t);
    const err = events.find(e => e.kind === 'error')!;
    expect(err.text).toContain("error TS2304: Cannot find name 'foo'.");
    expect(err.via).toBe('npm run build');
    expect(buildDigest(events)).toContain('ERROR [npm run build]: src/a.ts(3,1): error TS2304');
  });

  it('does not treat file contents that mention errors as a failure', () => {
    const t = jsonl(tool('Read', { file_path: '/repo/x.ts' }, 'throw new Error("bad input");\nTypeError: x'));
    expect(parseTranscript(t).events.some(e => e.kind === 'error')).toBe(false);
  });

  it('does not treat source printed by a shell command as a failure', () => {
    const t = jsonl(tool('Bash', { command: "sed -n '1,200p' src/index.ts" }, "  fail: (msg) => log(msg),\nthrow new TypeError('x')"));
    expect(parseTranscript(t).events.some(e => e.kind === 'error')).toBe(false);
  });

  it('still records a read command that itself failed', () => {
    const t = jsonl(tool('Bash', { command: 'cat missing.txt' }, 'cat: missing.txt: No such file or directory', true));
    expect(parseTranscript(t).events.some(e => e.kind === 'error')).toBe(true);
  });

  it('records edits and commands', () => {
    const t = jsonl(
      tool('Edit', { file_path: '/repo/a.ts', old_string: 'a', new_string: 'b' }, 'ok'),
      tool('Bash', { command: 'npm test' }, 'all passed'),
    );
    const kinds = parseTranscript(t).events.map(e => `${e.kind}:${e.text}`);
    expect(kinds).toEqual(['edit:/repo/a.ts', 'command:npm test']);
  });

  it('strips IDE and harness wrappers from what the user said', () => {
    const t = jsonl(user('<ide_opened_file>The user opened x.ts</ide_opened_file> why does login fail?<system-reminder>ctx</system-reminder>'));
    expect(parseTranscript(t).events).toEqual([{ kind: 'prompt', text: 'why does login fail?', line: 0 }]);
  });

  it('skips subagent turns', () => {
    const t = jsonl(JSON.stringify({ type: 'assistant', isSidechain: true, message: { content: [{ type: 'text', text: 'exploring' }] } }));
    expect(parseTranscript(t).events).toEqual([]);
  });

  it('reads from a cursor and reports where it stopped', () => {
    const t = jsonl(user('first'), user('second'), user('third'));
    const seg = parseTranscript(t, 1);
    expect(seg.events.map(e => e.text)).toEqual(['second', 'third']);
    expect(seg.endLine).toBe(3);
    expect(seg.sessionId).toBe('s1');
  });

  it('does not consume a line that is still being written', () => {
    const t = jsonl(user('done')) + '{"type":"user","mess';
    const seg = parseTranscript(t);
    expect(seg.endLine).toBe(1);
    expect(seg.events).toHaveLength(1);
  });

  it('survives malformed lines', () => {
    const t = 'not json\n' + jsonl(user('still read'));
    expect(parseTranscript(t).events.map(e => e.text)).toEqual(['still read']);
  });
});

describe('isEchoedOutput', () => {
  // Every message DevBrain sends an agent quotes the error it is about, so each
  // one lands in the transcript carrying error text. Generated here from the
  // real producers rather than copied, so a reworded message fails this test
  // instead of silently becoming its own evidence on the next parse.
  it('recognises every message DevBrain itself sends', async () => {
    const { formatStepBack, detectStuck } = await import('./stuck');
    const { buildRecordPrompt } = await import('./turnReview');
    const { formatRecallForAgent, recallForFailure } = await import('./recall');
    const { formatBackfillBatch } = await import('./backfill');

    const failure = 'Error: listen EADDRINUSE: address already in use :::8080';
    const entry = {
      id: 'e1', projectId: 'p1', type: 'fix' as const, title: 'Port 8080 held by a stale server',
      content: 'Kill it.', tags: [], createdAt: Date.now(), errorPattern: failure,
      project: { id: 'p1', name: 'app', path: '/p', stack: [], createdAt: 1, lastSeen: 1 },
    };
    const events = [
      { kind: 'error' as const, text: failure, via: 'npm start' },
      { kind: 'edit' as const, text: 'a.ts' },
      { kind: 'error' as const, text: failure, via: 'npm start' },
      { kind: 'error' as const, text: failure, via: 'npm start' },
    ];

    const messages = [
      formatStepBack(detectStuck(events))!,
      buildRecordPrompt(events),
      formatRecallForAgent(failure, recallForFailure(failure, [entry], { projectId: 'p1' }))!,
      formatBackfillBatch({
        project: 'app', commits: [], sessions: [], remainingCommits: 0,
        remainingSessions: 0, markedReviewed: true,
      }),
    ];
    for (const message of messages) {
      expect(isEchoedOutput(message), message.split('\n')[0]).toBe(true);
    }
  });

  it('treats a command printing an error it was handed as an echo', () => {
    const fixture = "src/a.ts(3,1): error TS2304: Cannot find name 'tier'.";
    expect(isEchoedOutput(fixture, `node -e "console.log('${fixture}')"`)).toBe(true);
  });

  it('leaves a real failure alone', () => {
    expect(isEchoedOutput("src/a.ts(3,1): error TS2304: Cannot find name 'tier'.", 'npm run build')).toBe(false);
    expect(isEchoedOutput('npm ERR! code ELIFECYCLE', 'npm test')).toBe(false);
  });

  it('does not treat a short line as evidence of an echo', () => {
    // "Exit code 1" appearing in a command proves nothing about its output.
    expect(isEchoedOutput('Exit code 1', 'sh check.sh && echo "Exit code 1"')).toBe(false);
  });

  it('produces no error event for DevBrain quoting itself', () => {
    const own = 'DevBrain: step back for a moment\n\n- the same error has come back 3 times: TypeError: x';
    const t = jsonl(tool('Bash', { command: 'sh ./e2e.sh' }, own, false));
    expect(parseTranscript(t).events.some(e => e.kind === 'error')).toBe(false);
  });
});

describe('errorExcerpt / looksLikeError', () => {
  it('keeps the error line and the one after it', () => {
    const out = 'compiling...\nok\nTypeError: x is undefined\n    at foo (a.js:1:2)\nmore noise';
    expect(errorExcerpt(out)).toBe('TypeError: x is undefined\n    at foo (a.js:1:2)');
  });

  it('falls back to the tail when an is_error result has no recognisable error line', () => {
    expect(errorExcerpt('line1\nline2\nsomething went sideways')).toContain('something went sideways');
  });

  it('flags failures by shape, not by the word "error" anywhere', () => {
    expect(looksLikeError('npm ERR! code ELIFECYCLE', false)).toBe(true);
    expect(looksLikeError('Exit code 1', false)).toBe(true);
    expect(looksLikeError('const error = handleError(e)', false)).toBe(false);
    expect(looksLikeError('anything', true)).toBe(true);
  });
});

const ev = (kind: DigestEvent['kind'], text = 'x'): DigestEvent => ({ kind, text });

describe('assessSegment', () => {
  it('a reading-and-answering stretch is not worth a model call', () => {
    expect(assessSegment([ev('prompt'), ev('command', 'ls'), ev('say', 'here is the layout')]).worth).toBe(false);
  });

  it('an error followed by an edit is worth a look', () => {
    const a = assessSegment([ev('error'), ev('edit')]);
    expect(a.worth).toBe(true);
    expect(a.unresolved).toBe(false);
  });

  it('an error after the last edit is still open', () => {
    expect(assessSegment([ev('edit'), ev('error')]).unresolved).toBe(true);
  });

  it('a long design discussion with a stated reason counts, even without edits', () => {
    const text = 'We should use a cursor file rather than a database row because '.repeat(50);
    expect(assessSegment([ev('prompt'), ev('say', text)]).worth).toBe(true);
  });
});

describe('buildDigest / chunkEvents', () => {
  it('fits the budget by dropping the agent\'s older prose before the evidence', () => {
    const events: DigestEvent[] = [
      ev('prompt', 'fix login'),
      ...Array.from({ length: 30 }, (_, i) => ev('say', `thinking out loud ${i} `.repeat(40))),
      ev('error', 'MongoServerError: bad auth : authentication failed'),
      ev('edit', '/repo/db.ts'),
      ev('say', 'The cause was a URL-encoded password.'),
    ];
    const digest = buildDigest(events, 3000);
    expect(digest.length).toBeLessThanOrEqual(3000);
    expect(digest).toContain('USER: fix login');
    expect(digest).toContain('ERROR: MongoServerError: bad auth');
    expect(digest).toContain('EDITED: /repo/db.ts');
    expect(digest).toContain('The cause was a URL-encoded password.');
  });

  it('collapses repeated edits of the same file', () => {
    expect(buildDigest([ev('edit', 'a.ts'), ev('edit', 'a.ts'), ev('edit', 'a.ts')])).toBe('EDITED: a.ts');
  });

  it('splits only where the user spoke', () => {
    const events = [ev('prompt', 'one'), ev('say', 'a'.repeat(800)), ev('prompt', 'two'), ev('say', 'b'.repeat(800))];
    const chunks = chunkEvents(events, 820);
    expect(chunks).toHaveLength(2);
    expect(chunks[1][0]).toEqual(ev('prompt', 'two'));
  });
});
