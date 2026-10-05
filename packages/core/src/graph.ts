// The edges between entries, and the queries that read them.
//
// Entries used to be a flat list of rows: a bug recorded on Tuesday and the fix
// recorded an hour later had nothing connecting them, so "where did this get
// fixed" had no answer and neither did "is this still open". Three fields carry
// the structure — `supersedes` (this corrects that), `fixes` (this closes that)
// and `sessionId` (these happened in one episode of work) — and everything here
// is a pure read over entries already loaded, so the CLI, the MCP server and the
// dashboard all derive the same shape from the same rules.

import type { Entry } from './types';
import { normalizeType } from './types';

/** An entry named in a prompt or a graph label: just enough to identify it. */
export interface EntryRef {
  id: string;
  title: string;
}

/**
 * Bugs recorded in this session that nothing has closed yet.
 *
 * Used to offer the `fixes` link at the moment the agent is writing a fix. The
 * window is the session on purpose: a bug from last month is not something the
 * agent can be expected to recognise as the one it just fixed, and offering a
 * long list of stale ids would get the whole hint ignored.
 *
 * Newest first, because the bug being worked on is nearly always the last one
 * written down.
 */
export function openBugsInSession(entries: readonly Entry[], sessionId: string): EntryRef[] {
  if (!sessionId) return [];
  const closed = new Set(entries.map(e => e.fixes).filter((id): id is string => !!id));
  return entries
    .filter(e => e.sessionId === sessionId)
    .filter(e => normalizeType(e.type) === 'bug')
    .filter(e => !closed.has(e.id) && !e.supersededBy)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(e => ({ id: e.id, title: e.title }));
}
