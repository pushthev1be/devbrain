// Local JSON storage — the zero-config default when MONGODB_URI is unset.
//
// Mirrors every storage function in db.ts with identical semantics, so nothing
// upstream needs to know which backend is active. Atlas becomes an upgrade you
// choose (for team sharing and server-side vector search) rather than a
// prerequisite for using DevBrain at all.
//
// Concurrency: writes reload from disk and then replace the file via an atomic
// rename, so a reader never observes a half-written file. Two writers landing in
// the same few milliseconds — an interactive save racing the post-commit hook —
// can still lose one update. Acceptable for a single-developer store; a shared
// team knowledge base is what MONGODB_URI is for.

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { Entry, Project } from './types';
import { RECALL_LOG_MAX } from './types';
import { cosineSimilarity } from './search';
import { normalizeProjectPath, sameProjectPath } from './projectPath';

interface ProcessedCommit {
  hash: string;
  projectId: string;
  processedAt: number;
}

interface LocalData {
  version: number;
  projects: Project[];
  entries: Entry[];
  processedCommits: ProcessedCommit[];
}

const EMPTY: LocalData = { version: 1, projects: [], entries: [], processedCommits: [] };

export function getLocalDbPath(): string {
  return join(homedir(), '.devbrain', 'db.json');
}

function read(): LocalData {
  const path = getLocalDbPath();
  if (!existsSync(path)) return { ...EMPTY, projects: [], entries: [], processedCommits: [] };
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8').replace(/^﻿/, '')) as Partial<LocalData>;
    return {
      version: parsed.version ?? 1,
      projects: parsed.projects ?? [],
      entries: parsed.entries ?? [],
      processedCommits: parsed.processedCommits ?? [],
    };
  } catch (err) {
    // A corrupt store must not look like an empty one — that would silently
    // discard the user's memory on the next write.
    throw new Error(
      `Local DevBrain database at ${path} is not valid JSON. ` +
      `Move it aside to start fresh, or repair it. (${err instanceof Error ? err.message : String(err)})`
    );
  }
}

function write(data: LocalData): void {
  const path = getLocalDbPath();
  const dir = join(homedir(), '.devbrain');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  renameSync(tmp, path);
}

// Reload-then-mutate, so concurrent processes work from current state rather
// than whatever this process last saw.
function mutate(fn: (data: LocalData) => void): void {
  const data = read();
  fn(data);
  write(data);
}

function projectFor(projects: Project[], projectId: string): Project {
  return (
    projects.find(p => p.id === projectId) ??
    // Matches the $ifNull fallback in the Mongo aggregation.
    { id: projectId, name: 'devbrain', path: '', stack: [], createdAt: 0, lastSeen: 0 }
  );
}

// ── projects ──────────────────────────────────────────────────────────────────

export async function upsertProject(project: Project): Promise<void> {
  const stored = { ...project, path: normalizeProjectPath(project.path) };
  mutate(data => {
    const idx = data.projects.findIndex(p => sameProjectPath(p.path, stored.path));
    if (idx === -1) data.projects.push(stored);
    else data.projects[idx] = stored;
  });
}

export async function getProjectByPath(path: string): Promise<Project | null> {
  return read().projects.find(p => sameProjectPath(p.path, path)) ?? null;
}

export async function getAllProjects(): Promise<Project[]> {
  return read().projects.slice().sort((a, b) => b.lastSeen - a.lastSeen);
}

// ── entries ───────────────────────────────────────────────────────────────────

export async function insertEntry(entry: Entry): Promise<void> {
  mutate(data => { data.entries.push(entry); });
}

export async function getEntriesByProject(projectId: string): Promise<Entry[]> {
  return read().entries
    .filter(e => e.projectId === projectId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getAllEntriesWithProjects(): Promise<(Entry & { project: Project })[]> {
  const { entries, projects } = read();
  return entries.map(e => ({ ...e, project: projectFor(projects, e.projectId) }));
}

export async function deleteEntry(id: string): Promise<void> {
  mutate(data => { data.entries = data.entries.filter(e => e.id !== id); });
}

// ── commits ───────────────────────────────────────────────────────────────────

export async function isCommitProcessed(hash: string): Promise<boolean> {
  return read().processedCommits.some(c => c.hash === hash);
}

/** The hashes, of those given, that have not been reviewed yet. One read. */
export async function filterUnprocessedCommits(hashes: string[]): Promise<string[]> {
  const done = new Set(read().processedCommits.map(c => c.hash));
  return hashes.filter(h => !done.has(h));
}

export async function markCommitProcessed(hash: string, projectId: string): Promise<void> {
  mutate(data => {
    // $setOnInsert semantics — first write wins, later ones are no-ops.
    if (data.processedCommits.some(c => c.hash === hash)) return;
    data.processedCommits.push({ hash, projectId, processedAt: Date.now() });
  });
}

// ── retrieval & confidence ────────────────────────────────────────────────────

// Tier from the number of independent human confirmations, not retrievals.
function tierFor(reinforcements: number): Entry['confidence'] {
  return reinforcements >= 2 ? 'confirmed' : reinforcements >= 1 ? 'corroborated' : 'observation';
}

/**
 * A human said "yes, this is right" — the only signal that confirms an entry.
 * Each explicit reinforcement moves it one tier, so two confirmations from a
 * person mark it confirmed. Automatic retrieval never does this.
 */
export async function reinforceEntry(id: string, contentUpdate?: string): Promise<void> {
  mutate(data => {
    const entry = data.entries.find(e => e.id === id);
    if (!entry) return;
    entry.reinforcedCount = (entry.reinforcedCount ?? 0) + 1;
    entry.lastRetrievedAt = Date.now();
    entry.confidence = tierFor(entry.reinforcedCount);
    if (contentUpdate !== undefined) entry.content = contentUpdate;
  });
}

export async function bumpRetrievalCounts(ids: string[], fromProjectId?: string): Promise<void> {
  if (!ids.length) return;
  mutate(data => {
    for (const entry of data.entries) {
      if (!ids.includes(entry.id)) continue;
      entry.retrievalCount = (entry.retrievalCount ?? 0) + 1;
      entry.lastRetrievedAt = Date.now();
      if (fromProjectId) {
        const seen = entry.seenInProjects ?? [];
        if (!seen.includes(fromProjectId)) seen.push(fromProjectId);
        entry.seenInProjects = seen;
      }
      // Retrieval does not promote confidence — see the note in db.ts. Only
      // independent re-observation across projects does.
      if (entry.confidence === 'observation' && (entry.seenInProjects?.length ?? 0) >= 2) {
        entry.confidence = 'corroborated';
      }
    }
  });
}

/** See db.ts: counts failures caught, not times shown. */
export async function bumpRecallCounts(
  ids: string[],
  context: { query?: string; sessionId?: string } = {},
): Promise<void> {
  if (!ids.length) return;
  const at = Date.now();
  mutate(data => {
    for (const entry of data.entries) {
      if (!ids.includes(entry.id)) continue;
      entry.recallCount = (entry.recallCount ?? 0) + 1;
      entry.lastRecalledAt = at;
      // Only when there is a query to record: a bump with nothing to say about
      // what matched would add a row that reads as a blank line in the log.
      if (context.query) {
        entry.recalls = [
          ...(entry.recalls ?? []),
          {
            at,
            query: context.query.slice(0, 200),
            ...(context.sessionId ? { sessionId: context.sessionId } : {}),
          },
        ].slice(-RECALL_LOG_MAX);
      }
    }
  });
}

export async function supersedeEntry(oldId: string, newId: string): Promise<void> {
  mutate(data => {
    const entry = data.entries.find(e => e.id === oldId);
    if (!entry) return;
    entry.supersededBy = newId;
    entry.supersededAt = Date.now();
    // Carry the chain's depth onto the replacement.
    const replacement = data.entries.find(e => e.id === newId);
    if (replacement) {
      replacement.supersedes = oldId;
      replacement.revisionCount = (entry.revisionCount ?? 0) + 1;
    }
  });
}

// ── vector search ─────────────────────────────────────────────────────────────

// Atlas runs $vectorSearch server-side against an index; locally we rank in
// memory over the stored embeddings. Same ordering, same shape, no index to
// provision — it just gets slower as the store grows.
export async function vectorSearch(
  queryEmbedding: number[],
  opts: { topK?: number; projectId?: string } = {}
): Promise<(Entry & { project: Project; vectorScore: number })[]> {
  const { topK = 10, projectId } = opts;
  const { entries, projects } = read();
  return entries
    .filter(e => e.embedding?.length && (!projectId || e.projectId === projectId))
    .map(e => ({
      ...e,
      project: projectFor(projects, e.projectId),
      vectorScore: cosineSimilarity(queryEmbedding, e.embedding!),
    }))
    .sort((a, b) => b.vectorScore - a.vectorScore)
    .slice(0, topK);
}
