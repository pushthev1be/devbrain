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
  /**
   * Stuck signals already raised this session.
   *
   * An interruption that fires every turn while the agent is still working the
   * problem stops being an interruption and becomes noise to route around, so
   * each distinct loop is named once.
   */
  warned?: string[];
}

/** Older name, kept because the cursor is what most callers want. */
export type CursorState = SessionState;

function sessionsDir(): string {
  return join(homedir(), '.devbrain', 'sessions');
}

function cursorPath(sessionId: string): string {
  return join(sessionsDir(), `${sessionId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120)}.json`);
}

/** The file as it stands, unnormalised. */
function readRaw(sessionId: string): Partial<SessionState> {
  try {
    return JSON.parse(readFileSync(cursorPath(sessionId), 'utf-8')) as Partial<SessionState>;
  } catch {
    return {};
  }
}

export function readCursor(sessionId: string): SessionState {
  const parsed = readRaw(sessionId);
  return {
    line: parsed.line ?? 0,
    updatedAt: parsed.updatedAt ?? 0,
    ...(Array.isArray(parsed.surfaced) ? { surfaced: parsed.surfaced } : {}),
    ...(Array.isArray(parsed.warned) ? { warned: parsed.warned } : {}),
  };
}

/**
 * Merge a change into the session's state, keeping the fields not named.
 *
 * Merged onto the raw file rather than onto readCursor's view, because a
 * normaliser that forgets a field would quietly erase it on the next write of
 * any other field — which is exactly what happened to `warned`, leaving the
 * step-back interruption firing again every turn.
 */
function patchState(sessionId: string, patch: Partial<SessionState>): void {
  const next = { ...readRaw(sessionId), ...patch, updatedAt: Date.now() };
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

/** Record that these loops have been raised, so each is named once per session. */
export function markWarned(sessionId: string, fingerprints: readonly string[]): void {
  if (!fingerprints.length) return;
  const seen = readCursor(sessionId).warned ?? [];
  patchState(sessionId, { warned: [...new Set([...seen, ...fingerprints])].slice(-100) });
}
