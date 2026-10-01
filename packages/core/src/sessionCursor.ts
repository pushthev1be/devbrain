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

export interface CursorState {
  line: number;
  updatedAt: number;
}

function sessionsDir(): string {
  return join(homedir(), '.devbrain', 'sessions');
}

function cursorPath(sessionId: string): string {
  return join(sessionsDir(), `${sessionId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120)}.json`);
}

export function readCursor(sessionId: string): CursorState {
  try {
    const parsed = JSON.parse(readFileSync(cursorPath(sessionId), 'utf-8')) as Partial<CursorState>;
    return { line: parsed.line ?? 0, updatedAt: parsed.updatedAt ?? 0 };
  } catch {
    return { line: 0, updatedAt: 0 };
  }
}

export function writeCursor(sessionId: string, line: number): void {
  mkdirSync(sessionsDir(), { recursive: true });
  writeFileSync(cursorPath(sessionId), JSON.stringify({ line, updatedAt: Date.now() }), 'utf-8');
}
