// Background capture from coding-agent sessions.
//
// Called from the agent's own lifecycle hooks (see the CLI's `devbrain hook`),
// in a detached process, so the agent never waits on it. Each run reads only
// the part of the transcript it has not seen, decides cheaply whether anything
// there could be worth keeping, and only then spends a model call.
//
// State per session is a cursor file under ~/.devbrain/sessions: the line up to
// which the transcript has been consumed. That is what makes running after
// every agent turn safe — nothing is extracted twice — and what lets a past
// session be backfilled and then picked up again where it stopped.

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, statSync, openSync, closeSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { nanoid } from 'nanoid';
import { insertEntry } from './db';
import { findDuplicate } from './dedupe';
import { getEmbedding, extractSessionKnowledge, RateLimitError } from './gemini';
import type { RecapEntry } from './gemini';
import { clip } from './search';
import { parseTranscript, assessSegment, buildDigest, chunkEvents } from './transcript';
import type { DigestEvent } from './transcript';
import type { Entry } from './types';

/**
 * `turn`  — the agent finished a turn; more may follow. Waits while an error is
 *           still unresolved, since the fix has not happened yet.
 * `final` — the session ended or is about to be compacted. Takes what there is.
 */
export type CaptureMode = 'turn' | 'final';

export interface CaptureResult {
  status: 'saved' | 'nothing' | 'waiting' | 'locked' | 'rate-limited' | 'missing';
  saved: Entry[];
  duplicates: number;
  /** Line the cursor now points at. */
  cursor: number;
}

interface CursorState {
  line: number;
  updatedAt: number;
  saved: number;
}

const CHUNK_BUDGET = 14_000;
/** Bounds the cost of one run over a very long session; the rest waits for the next. */
const MAX_CHUNKS_PER_RUN = 6;
const LOCK_STALE_MS = 10 * 60 * 1000;

function sessionsDir(): string {
  return join(homedir(), '.devbrain', 'sessions');
}

function safeId(sessionId: string): string {
  return sessionId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120);
}

export function readCursor(sessionId: string): CursorState {
  const path = join(sessionsDir(), `${safeId(sessionId)}.json`);
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as Partial<CursorState>;
    return { line: parsed.line ?? 0, updatedAt: parsed.updatedAt ?? 0, saved: parsed.saved ?? 0 };
  } catch {
    return { line: 0, updatedAt: 0, saved: 0 };
  }
}

function writeCursor(sessionId: string, state: CursorState): void {
  mkdirSync(sessionsDir(), { recursive: true });
  writeFileSync(join(sessionsDir(), `${safeId(sessionId)}.json`), JSON.stringify(state), 'utf-8');
}

/**
 * One worker per session at a time. Two Stop hooks can fire close together;
 * without this both read the same cursor and save the same entries twice.
 */
function acquireLock(sessionId: string): (() => void) | null {
  mkdirSync(sessionsDir(), { recursive: true });
  const path = join(sessionsDir(), `${safeId(sessionId)}.lock`);
  try {
    if (existsSync(path) && Date.now() - statSync(path).mtimeMs > LOCK_STALE_MS) unlinkSync(path);
    closeSync(openSync(path, 'wx'));
  } catch {
    return null;
  }
  return () => { try { unlinkSync(path); } catch { /* already gone */ } };
}

/**
 * Embed, skip near-duplicates of what the project already holds, insert.
 * Shared by every path that turns extracted knowledge into entries, so a recap
 * that restates mid-session saves cannot duplicate them.
 */
export async function saveExtracted(
  projectId: string,
  entries: RecapEntry[],
  meta: { createdAt?: number; tags?: string[] } = {},
): Promise<{ saved: Entry[]; duplicates: number }> {
  const saved: Entry[] = [];
  let duplicates = 0;
  for (const e of entries) {
    let embedding: number[] | undefined;
    try { embedding = await getEmbedding(`${e.title} ${e.content} ${e.tags.join(' ')}`); } catch (err) {
      if (err instanceof RateLimitError) throw err;
    }
    if (embedding && await findDuplicate(embedding, projectId).catch(() => null)) {
      duplicates++;
      continue;
    }
    const entry: Entry = {
      id: nanoid(), projectId,
      type: e.type, title: clip(e.title, 120), content: e.content,
      tags: [...new Set([...e.tags, ...(meta.tags ?? [])])],
      embedding, createdAt: meta.createdAt ?? Date.now(), confidence: 'observation',
      ...(e.category       ? { category: e.category }             : {}),
      ...(e.errorPattern   ? { errorPattern: e.errorPattern }     : {}),
      ...(e.causeArchetype ? { causeArchetype: e.causeArchetype } : {}),
    };
    await insertEntry(entry);
    saved.push(entry);
  }
  return { saved, duplicates };
}

function background(events: DigestEvent[]): string {
  return events.length ? buildDigest(events.slice(-40), 3000) : '';
}

/**
 * Process the unseen part of one session transcript for a registered project.
 * Never throws for expected conditions; the caller runs detached with no one
 * to report to, so the result says what happened.
 */
export async function captureSession(opts: {
  transcriptPath: string;
  sessionId: string;
  projectId: string;
  mode: CaptureMode;
}): Promise<CaptureResult> {
  const { transcriptPath, sessionId, projectId, mode } = opts;
  const cursor = readCursor(sessionId);
  const none = (status: CaptureResult['status'], at = cursor.line): CaptureResult =>
    ({ status, saved: [], duplicates: 0, cursor: at });

  if (!existsSync(transcriptPath)) return none('missing');
  const release = acquireLock(sessionId);
  if (!release) return none('locked');

  try {
    const jsonl = readFileSync(transcriptPath, 'utf-8');
    const segment = parseTranscript(jsonl, cursor.line);
    if (segment.endLine <= cursor.line) return none('nothing');

    const assessment = assessSegment(segment.events);
    if (!assessment.worth) {
      // Small talk and reading. Hold the cursor on a turn, so this stretch is
      // still seen together with whatever comes next — a question now, the bug
      // it leads to later. At the end of a session, let it go.
      if (mode === 'final') writeCursor(sessionId, { ...cursor, line: segment.endLine, updatedAt: Date.now() });
      return none('nothing', mode === 'final' ? segment.endLine : cursor.line);
    }
    if (mode === 'turn' && assessment.unresolved) return none('waiting');

    // Earlier, already-processed session text, so a fix is read with its cause.
    const prior = cursor.line > 0 ? parseTranscript(jsonl.split('\n').slice(Math.max(0, cursor.line - 400), cursor.line).join('\n') + '\n').events : [];

    const chunks = chunkEvents(segment.events, CHUNK_BUDGET);
    const result: CaptureResult = { status: 'nothing', saved: [], duplicates: 0, cursor: cursor.line };
    let context = background(prior);
    let savedTotal = cursor.saved;

    for (const [i, chunk] of chunks.slice(0, MAX_CHUNKS_PER_RUN).entries()) {
      let extracted: RecapEntry[];
      try {
        extracted = assessSegment(chunk).worth
          ? await extractSessionKnowledge(buildDigest(chunk, CHUNK_BUDGET), context)
          : [];
      } catch (err) {
        if (err instanceof RateLimitError) {
          result.status = result.saved.length ? 'saved' : 'rate-limited';
          return result;
        }
        throw err;
      }
      const { saved, duplicates } = await saveExtracted(projectId, extracted, { tags: ['session'] });
      result.saved.push(...saved);
      result.duplicates += duplicates;
      savedTotal += saved.length;
      context = background(chunk);

      // Advance after every chunk, so a rate limit or crash later in a long
      // session keeps what was already done, and the next run starts exactly
      // where this one stopped.
      const next = chunks[i + 1]?.[0]?.line;
      result.cursor = next ?? segment.endLine;
      writeCursor(sessionId, { line: result.cursor, updatedAt: Date.now(), saved: savedTotal });
    }

    result.status = result.saved.length ? 'saved' : 'nothing';
    return result;
  } finally {
    release();
  }
}
