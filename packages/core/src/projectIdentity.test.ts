/**
 * One repository, one project — across clones and worktrees.
 *
 * Real git repositories in temp folders, because the identity comes from
 * `git remote`, and an isolated local store (homedir mocked), because merging
 * rewrites records.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Entry, Project } from './types';

vi.mock('os', async importOriginal => {
  const actual = await importOriginal<typeof import('os')>();
  return { ...actual, homedir: () => process.env.__DEVBRAIN_TEST_HOME as string };
});

import { upsertProject, getProjectByPath, getAllProjects, getAllEntriesWithProjects, getLocalDbPath } from './db';
import { mergeDuplicateProjects } from './projectIdentity';
import { normalizeProjectPath } from './projectPath';

let home: string;
let savedUri: string | undefined;

function repo(remote?: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'devbrain-clone-'));
  execSync('git init -q', { cwd: dir });
  if (remote) execSync(`git remote add origin ${remote}`, { cwd: dir });
  return dir;
}

function project(id: string, path: string, createdAt: number, o: Partial<Project> = {}): Project {
  return { id, name: 'app', path, stack: [], createdAt, lastSeen: createdAt, ...o };
}

function entry(id: string, projectId: string): Entry {
  return { id, projectId, type: 'fix', title: id, content: id, tags: [], createdAt: 1, confidence: 'observation' } as Entry;
}

const dirs: string[] = [];
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'devbrain-test-'));
  process.env.__DEVBRAIN_TEST_HOME = home;
  savedUri = process.env.MONGODB_URI;
  delete process.env.MONGODB_URI;
});

afterEach(() => {
  for (const d of [home, ...dirs.splice(0)]) rmSync(d, { recursive: true, force: true });
  delete process.env.__DEVBRAIN_TEST_HOME;
  if (savedUri !== undefined) process.env.MONGODB_URI = savedUri;
});

const clone = (remote?: string) => { const d = repo(remote); dirs.push(d); return d; };

describe('project identity', () => {
  it('records the remote on first write', async () => {
    const a = clone('git@github.com:Owner/App.git');
    await upsertProject(project('p1', a, 1));
    expect((await getAllProjects())[0].remote).toBe('github.com/owner/app');
  });

  it('records null, not nothing, for a folder with no remote', async () => {
    const a = clone();
    await upsertProject(project('p1', a, 1));
    expect((await getAllProjects())[0].remote).toBeNull();
  });

  // The defect: every new clone or worktree registered as an empty project.
  it('finds a second clone as the same project, at its own path', async () => {
    const a = clone('https://github.com/owner/app.git');
    const b = clone('git@github.com:owner/app.git');
    await upsertProject(project('p1', a, 1));
    const found = await getProjectByPath(b);
    expect(found).toMatchObject({ id: 'p1', path: normalizeProjectPath(b) });
  });

  it('does not match a clone of a different repository', async () => {
    await upsertProject(project('p1', clone('https://github.com/owner/app.git'), 1));
    expect(await getProjectByPath(clone('https://github.com/owner/other.git'))).toBeNull();
    expect(await getProjectByPath(clone())).toBeNull();
  });

  it('writing the found project back moves it, rather than adding a record', async () => {
    const a = clone('https://github.com/owner/app.git');
    const b = clone('https://github.com/owner/app.git');
    await upsertProject(project('p1', a, 1));
    const found = (await getProjectByPath(b))!;
    await upsertProject({ ...found, lastSeen: 5 });
    const all = await getAllProjects();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: 'p1', path: normalizeProjectPath(b) });
  });
});

describe('mergeDuplicateProjects', () => {
  it('folds earlier records of the same repo into the oldest, entries and all', async () => {
    const a = clone('https://github.com/owner/app.git');
    const b = clone('https://github.com/owner/app.git');
    const c = clone('https://github.com/owner/other.git');
    // Written straight to the file, as a store from before remotes were
    // recorded looks: upsertProject would fill the field in on the way.
    mkdirSync(join(home, '.devbrain'), { recursive: true });
    writeFileSync(getLocalDbPath(), JSON.stringify({
      version: 1,
      projects: [project('old', a, 1), project('dup', b, 2), project('else', c, 3)]
        .map(p => ({ ...p, path: normalizeProjectPath(p.path) })),
      entries: [entry('e-old', 'old'), entry('e-dup', 'dup'), entry('e-else', 'else')],
      processedCommits: [],
    }));
    expect((await getAllProjects()).every(p => p.remote === undefined)).toBe(true);

    const merge = await mergeDuplicateProjects(b);

    expect(merge?.into).toMatchObject({ id: 'old', path: normalizeProjectPath(b), remote: 'github.com/owner/app' });
    expect(merge?.merged.map(m => [m.project.id, m.entries])).toEqual([['dup', 1]]);
    expect((await getAllProjects()).map(p => p.id).sort()).toEqual(['else', 'old']);
    const owners = Object.fromEntries((await getAllEntriesWithProjects()).map(e => [e.id, e.projectId]));
    expect(owners).toEqual({ 'e-old': 'old', 'e-dup': 'old', 'e-else': 'else' });
    expect(await getProjectByPath(b)).toMatchObject({ id: 'old' });
  });

  it('is a no-op with nothing to merge, and in a folder with no remote', async () => {
    const a = clone('https://github.com/owner/app.git');
    await upsertProject(project('p1', a, 1));
    expect(await mergeDuplicateProjects(a)).toBeNull();
    expect(await mergeDuplicateProjects(clone())).toBeNull();
    expect(await getAllProjects()).toHaveLength(1);
  });
});
