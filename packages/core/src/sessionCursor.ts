// How far each agent session's transcript has been reviewed.
//
// One small file per session under ~/.devbrain/sessions, holding the line up to
// which DevBrain has already asked about (Stop hook) or handed over (backfill)
// that session's work. It is what lets the Stop hook run after every turn
// without asking twice, and lets backfill pick up a past session where the hook
// or an earlier backfill left off. Transcripts are per machine, so this is too.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface SessionState {
  /** Transcript line reviewed up to. */
  line: number;
  updatedAt: number;
  /** Entry ids DevBrain has already volunteered this session, so it never repeats one. */
  surfaced?: string[];
}

/** Older name, kept because the cursor is what most callers want. */
export type CursorState = SessionState;

function sessionsDir(): string {
  return join(homedir(), '.devbrain', 'sessions');
}

function cursorPath(sessionId: string): string {
  return join(sessionsDir(), `${sessionId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120)}.json`);
}

export function readCursor(sessionId: string): SessionState {
  try {
    const parsed = JSON.parse(readFileSync(cursorPath(sessionId), 'utf-8')) as Partial<SessionState>;
    return {
      line: parsed.line ?? 0,
      updatedAt: parsed.updatedAt ?? 0,
      ...(Array.isArray(parsed.surfaced) ? { surfaced: parsed.surfaced } : {}),
    };
  } catch {
    return { line: 0, updatedAt: 0 };
  }
}

/** Merge a change into the session's state, keeping the fields not named. */
function patchState(sessionId: string, patch: Partial<SessionState>): void {
  const next = { ...readCursor(sessionId), ...patch, updatedAt: Date.now() };
  mkdirSync(sessionsDir(), { recursive: true });
  writeFileSync(cursorPath(sessionId), JSON.stringify(next), 'utf-8');
}

export function writeCursor(sessionId: string, line: number): void {
  patchState(sessionId, { line });
}

/**
 * Record entries DevBrain volunteered, so the same past fix is not pushed at
 * the agent again every time a flaky command fails.
 *
 * Capped: a long session must not grow this file without bound, and an id old
 * enough to fall off is one the agent saw long ago anyway.
 */
export function markSurfaced(sessionId: string, ids: readonly string[]): void {
  if (!ids.length) return;
  const seen = readCursor(sessionId).surfaced ?? [];
  patchState(sessionId, { surfaced: [...new Set([...seen, ...ids])].slice(-200) });
}
