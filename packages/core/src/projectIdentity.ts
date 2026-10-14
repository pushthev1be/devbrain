/**
 * One repository, one project.
 *
 * Projects used to be keyed by path alone, so each clone and each worktree of a
 * repository registered as a separate, empty project. Its own history then read
 * as another project's — ranked lower, labelled "other project", and held to a
 * cross-project bar — and an entry surfaced from two checkouts counted as seen
 * in two projects. getProjectByPath now falls back to the remote, so no new
 * duplicates are made; this folds together the ones already stored.
 */
import { existsSync } from 'fs';
import { nanoid } from 'nanoid';
import type { Project } from './types';
import { getAllProjects, getProjectByPath, upsertProject, reassignProject } from './db';
import { getRepoRemote, isGitRepo } from './git';
import { normalizeProjectPath } from './projectPath';
import { detectStack, getProjectName, looksLikeProject } from './stack';

/** The inbox for entries saved from somewhere that is not a project. */
export const UNFILED_PROJECT_ID = 'unfiled';

export async function unfiledProject(): Promise<Project> {
  const existing = await getProjectByPath(UNFILED_PROJECT_ID);
  const project = existing
    ? { ...existing, lastSeen: Date.now() }
    : { id: UNFILED_PROJECT_ID, name: 'Unfiled', path: UNFILED_PROJECT_ID, remote: null, stack: [], createdAt: Date.now(), lastSeen: Date.now() };
  await upsertProject(project);
  return project;
}

/**
 * The project a save from this folder belongs to.
 *
 * A known project, or this folder registered as one — but only when it looks
 * like one, by the same test the session-start hook applies. A save is the
 * other way a folder used to be registered, and it registered anything: an
 * agent saving from the home directory made the home directory a project,
 * which then sat in every list and graph as a repo that does not exist.
 * Saved from anywhere else, the entry goes to the Unfiled inbox, the same
 * place the dashboard puts an entry with no project named. Nothing is lost.
 */
export async function projectForSave(repoRoot: string): Promise<{ project: Project; unfiled: boolean }> {
  const known = await getProjectByPath(repoRoot);
  if (known) return { project: known, unfiled: false };
  const stack = detectStack(repoRoot);
  if (!looksLikeProject({ isGitRepo: isGitRepo(repoRoot), stack })) {
    return { project: await unfiledProject(), unfiled: true };
  }
  const project: Project = {
    id: nanoid(), name: getProjectName(repoRoot), path: repoRoot, stack,
    createdAt: Date.now(), lastSeen: Date.now(),
  };
  await upsertProject(project);
  return { project, unfiled: false };
}

export interface ProjectMerge {
  /** The record that remains: the oldest of them, now at this checkout's path. */
  into: Project;
  merged: { project: Project; entries: number }[];
}

/**
 * Merge every project record of the repository at repoRoot into the oldest.
 *
 * Scoped to this one repository on purpose: it runs at session start, and a
 * session in one repo has no business rewriting another's records. Records
 * written before remotes were stored learn theirs here, from their own path
 * when it still exists, so a duplicate is recognised whichever checkout made it.
 * Null when there is nothing to merge, including a folder with no remote.
 */
export async function mergeDuplicateProjects(repoRoot: string): Promise<ProjectMerge | null> {
  const remote = getRepoRemote(repoRoot);
  if (!remote) return null;

  const same: Project[] = [];
  for (const p of await getAllProjects()) {
    let r = p.remote;
    if (r === undefined) {
      r = p.path && existsSync(p.path) ? getRepoRemote(p.path) : null;
      await upsertProject({ ...p, remote: r });
    }
    if (r === remote) same.push({ ...p, remote: r });
  }
  if (same.length < 2) return null;

  same.sort((a, b) => a.createdAt - b.createdAt);
  const [into, ...rest] = same;
  const merged: ProjectMerge['merged'] = [];
  for (const project of rest) {
    merged.push({ project, entries: await reassignProject(project.id, into.id) });
  }
  // Deleted first, so this path is free for the record that remains.
  const kept = { ...into, path: normalizeProjectPath(repoRoot), remote, lastSeen: Date.now() };
  await upsertProject(kept);
  return { into: kept, merged };
}
