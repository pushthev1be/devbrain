import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import type { Entry, Project } from './types';

const DEVBRAIN_DIR = join(homedir(), '.devbrain');
const DB_PATH = join(DEVBRAIN_DIR, 'db.json');

interface DbSchema {
  projects: Project[];
  entries: Entry[];
  processedCommits: { hash: string; projectId: string; processedAt: number }[];
}

function loadDb(): DbSchema {
  mkdirSync(DEVBRAIN_DIR, { recursive: true });
  if (!existsSync(DB_PATH)) {
    return { projects: [], entries: [], processedCommits: [] };
  }
  try {
    return JSON.parse(readFileSync(DB_PATH, 'utf-8')) as DbSchema;
  } catch {
    return { projects: [], entries: [], processedCommits: [] };
  }
}

function saveDb(data: DbSchema): void {
  mkdirSync(DEVBRAIN_DIR, { recursive: true });
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function upsertProject(project: Project): Promise<void> {
  const db = loadDb();
  const idx = db.projects.findIndex(p => p.path === project.path);
  if (idx >= 0) {
    db.projects[idx] = project;
  } else {
    db.projects.push(project);
  }
  saveDb(db);
}

export async function getProjectByPath(path: string): Promise<Project | null> {
  return loadDb().projects.find(p => p.path === path) ?? null;
}

export async function getAllProjects(): Promise<Project[]> {
  return loadDb().projects.sort((a, b) => b.lastSeen - a.lastSeen);
}

export async function insertEntry(entry: Entry): Promise<void> {
  const db = loadDb();
  db.entries.push(entry);
  saveDb(db);
}

export async function getEntriesByProject(projectId: string): Promise<Entry[]> {
  return loadDb().entries
    .filter(e => e.projectId === projectId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getAllEntriesWithProjects(): Promise<(Entry & { project: Project })[]> {
  const db = loadDb();
  const projectMap = new Map(db.projects.map(p => [p.id, p]));
  return db.entries
    .filter(e => projectMap.has(e.projectId))
    .map(e => ({ ...e, project: projectMap.get(e.projectId)! }));
}

export async function isCommitProcessed(hash: string): Promise<boolean> {
  return loadDb().processedCommits.some(c => c.hash === hash);
}

export async function markCommitProcessed(hash: string, projectId: string): Promise<void> {
  const db = loadDb();
  if (!db.processedCommits.some(c => c.hash === hash)) {
    db.processedCommits.push({ hash, projectId, processedAt: Date.now() });
    saveDb(db);
  }
}

export function getDevbrainDir(): string {
  return DEVBRAIN_DIR;
}

export async function reinforceEntry(id: string, contentUpdate?: string): Promise<void> {
  const db = loadDb();
  const idx = db.entries.findIndex(e => e.id === id);
  if (idx < 0) return;
  const entry = db.entries[idx];
  const count = (entry.retrievalCount ?? 0) + 1;
  const confidence: Entry['confidence'] = count >= 3 ? 'confirmed' : count >= 2 ? 'corroborated' : 'observation';
  db.entries[idx] = {
    ...entry,
    retrievalCount: count,
    lastRetrievedAt: Date.now(),
    confidence,
    ...(contentUpdate !== undefined ? { content: contentUpdate } : {}),
  };
  saveDb(db);
}

export async function bumpRetrievalCounts(ids: string[], fromProjectId?: string): Promise<void> {
  if (ids.length === 0) return;
  const db = loadDb();
  const idSet = new Set(ids);
  for (let i = 0; i < db.entries.length; i++) {
    if (!idSet.has(db.entries[i].id)) continue;
    const entry = db.entries[i];
    const seenIn = entry.seenInProjects ? [...entry.seenInProjects] : [];
    if (fromProjectId && !seenIn.includes(fromProjectId)) {
      seenIn.push(fromProjectId);
    }
    db.entries[i] = {
      ...entry,
      retrievalCount: (entry.retrievalCount ?? 0) + 1,
      lastRetrievedAt: Date.now(),
      seenInProjects: seenIn,
    };
  }
  saveDb(db);
}

export async function supersedeEntry(oldId: string, newId: string): Promise<void> {
  const db = loadDb();
  const idx = db.entries.findIndex(e => e.id === oldId);
  if (idx < 0) return;
  db.entries[idx] = { ...db.entries[idx], supersededBy: newId, supersededAt: Date.now() };
  saveDb(db);
}
