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
import type { Project } from './types';
import { getAllProjects, upsertProject, reassignProject } from './db';
import { getRepoRemote } from './git';
import { normalizeProjectPath } from './projectPath';

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
