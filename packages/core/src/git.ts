import { execSync } from 'child_process';
import { writeFileSync, existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { CommitInfo } from './types';

export function isGitRepo(path: string): boolean {
  try {
    execSync('git rev-parse --git-dir', { cwd: path, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function getRepoRoot(cwd: string): string | null {
  try {
    return execSync('git rev-parse --show-toplevel', { cwd, stdio: 'pipe' }).toString().trim();
  } catch {
    return null;
  }
}

// A single commit's diff can dwarf execSync's 1MB default maxBuffer, which would
// throw and silently yield no knowledge for exactly the large refactors worth
// remembering. Read generously, then cap: extractKnowledge only uses the first
// 6000 chars anyway.
const DIFF_MAX_BUFFER = 32 * 1024 * 1024;
const DIFF_CHAR_LIMIT = 20_000;

function readCommit(repoPath: string, ref: string): CommitInfo | null {
  try {
    const git = (args: string, maxBuffer?: number) =>
      execSync(`git ${args}`, { cwd: repoPath, stdio: 'pipe', maxBuffer }).toString().trim();

    const hash = git(`rev-parse ${ref}`);
    const message = git(`log -1 --format=%s ${hash}`);
    const timestamp = parseInt(git(`log -1 --format=%ct ${hash}`), 10) * 1000;

    const stat = git(`show --stat --format="" ${hash}`, DIFF_MAX_BUFFER);
    const diff = git(`show --format="" ${hash}`, DIFF_MAX_BUFFER);

    return {
      hash,
      message,
      timestamp,
      diff: `${stat}\n\n${diff}`.slice(0, DIFF_CHAR_LIMIT),
    };
  } catch {
    return null;
  }
}

export function getLastCommit(repoPath: string): CommitInfo | null {
  return readCommit(repoPath, 'HEAD');
}

/**
 * Most recent commits, newest first, for backfilling an existing repo's history.
 * Merges are excluded: they carry no authored knowledge and extractKnowledge
 * discards them anyway, so skipping them means `limit` buys real commits.
 */
export function getRecentCommits(repoPath: string, limit = 20): CommitInfo[] {
  if (limit <= 0) return [];
  try {
    const hashes = execSync(`git log --no-merges --format=%H -n ${limit}`, {
      cwd: repoPath,
      stdio: 'pipe',
    })
      .toString()
      .trim()
      .split('\n')
      .map(h => h.trim())
      .filter(Boolean);

    return hashes
      .map(h => readCommit(repoPath, h))
      .filter((c): c is CommitInfo => c !== null);
  } catch {
    return [];
  }
}

/**
 * Hashes of the most recent non-merge commits, newest first. Cheap — no diffs —
 * so it can run at session start to count what has not been reviewed.
 */
export function listCommitHashes(repoPath: string, limit = 200): string[] {
  if (limit <= 0) return [];
  try {
    return execSync(`git log --no-merges --format=%H -n ${limit}`, { cwd: repoPath, stdio: 'pipe' })
      .toString().trim().split('\n').map(h => h.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/** One commit with its stat and diff, or null if it cannot be read. */
export function getCommit(repoPath: string, hash: string): CommitInfo | null {
  return readCommit(repoPath, hash);
}

/** Total non-merge commits in the repo — used to size a backfill before running it. */
export function countCommits(repoPath: string): number {
  try {
    const out = execSync('git rev-list --no-merges --count HEAD', {
      cwd: repoPath,
      stdio: 'pipe',
    }).toString().trim();
    const n = parseInt(out, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * Remove the post-commit hook earlier versions installed.
 *
 * It ran `devbrain capture`, which had a model read each commit's diff. Commits
 * are now reviewed by the coding agent instead (`devbrain backfill`), so the
 * hook has nothing left to do. Other lines in a shared hook file are kept; a
 * file that held only DevBrain's line is deleted.
 */
export function removeGitHook(repoPath: string): boolean {
  const hookPath = join(repoPath, '.git', 'hooks', 'post-commit');
  if (!existsSync(hookPath)) return false;
  const content = readFileSync(hookPath, 'utf-8');
  if (!content.includes('devbrain capture')) return false;
  const kept = content.split('\n').filter(l => !l.includes('devbrain capture'));
  if (kept.every(l => !l.trim() || l.startsWith('#!'))) unlinkSync(hookPath);
  else writeFileSync(hookPath, kept.join('\n'), 'utf-8');
  return true;
}

export function isHookInstalled(repoPath: string): boolean {
  const hookPath = join(repoPath, '.git', 'hooks', 'post-commit');
  if (!existsSync(hookPath)) return false;
  try {
    const content = readFileSync(hookPath, 'utf-8');
    return content.includes('devbrain capture');
  } catch {
    return false;
  }
}
