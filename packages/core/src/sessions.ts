// Session tracking — noticing when work ended without being written down.
//
// The richest knowledge comes from a session recap, but nothing made an agent
// write one. DEV_CONTEXT.md asks; if the agent ignores it, the session simply
// vanishes and no one finds out. Commit capture does not cover the gap either:
// the reasoning behind a change, the approaches rejected, and the things that
// wasted an hour rarely appear in a diff.
//
// So: task_start opens a session, task_end closes it. An session left open is
// evidence that work happened and was never recorded, and that fact is surfaced
// the next time anyone asks for context — to the agent, and to the human in
// `devbrain project`.
//
// This records only a short description and timestamps. No transcript, no diff.

import { getAllProjects, upsertProject } from './db';
import type { Project } from './types';

export interface OpenSession {
  projectId: string;
  description: string;
  startedAt: number;
}

/**
 * How long an open session must sit before it counts as abandoned. Short enough
 * to catch the same working day, long enough that a normal task in progress is
 * not flagged at its own next tool call.
 */
export const STALE_SESSION_MS = 45 * 60 * 1000;

// Sessions are stored on the project document rather than in their own
// collection: there is at most one open session per project, the data is tiny,
// and it keeps the local JSON backend and MongoDB identical without a migration.
interface ProjectWithSession extends Project {
  openSession?: OpenSession | null;
}

async function loadProject(projectId: string): Promise<ProjectWithSession | undefined> {
  return (await getAllProjects()).find(p => p.id === projectId) as ProjectWithSession | undefined;
}

export async function startSession(projectId: string, description: string): Promise<void> {
  const project = await loadProject(projectId);
  if (!project) return;
  await upsertProject({
    ...project,
    lastSeen: Date.now(),
    openSession: { projectId, description: description.slice(0, 200), startedAt: Date.now() },
  } as Project);
}

export async function endSession(projectId: string): Promise<void> {
  const project = await loadProject(projectId);
  if (!project) return;
  await upsertProject({ ...project, lastSeen: Date.now(), openSession: null } as Project);
}

export async function getOpenSession(projectId: string): Promise<OpenSession | null> {
  const project = await loadProject(projectId);
  return project?.openSession ?? null;
}

/**
 * A session that was started, never closed, and is old enough to be abandoned.
 * Returns null while a session is simply still in progress.
 */
export async function getAbandonedSession(
  projectId: string,
  now: number = Date.now(),
): Promise<OpenSession | null> {
  const open = await getOpenSession(projectId);
  if (!open) return null;
  return now - open.startedAt >= STALE_SESSION_MS ? open : null;
}

/** Human-readable nudge for an abandoned session, or null when there is none. */
export function describeAbandonedSession(session: OpenSession | null, now: number = Date.now()): string | null {
  if (!session) return null;
  const hours = Math.round((now - session.startedAt) / 3_600_000);
  const when = hours < 1 ? 'less than an hour ago'
    : hours < 24 ? `${hours}h ago`
    : `${Math.round(hours / 24)}d ago`;
  return `A session started ${when} ("${session.description}") was never recapped, so whatever was learned in it is not saved.`;
}
