import { execSync } from 'child_process';
import { writeFileSync, chmodSync, existsSync, mkdirSync } from 'fs';
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

export function installGitHook(repoPath: string): void {
  const hooksDir = join(repoPath, '.git', 'hooks');
  mkdirSync(hooksDir, { recursive: true });

  const hookPath = join(hooksDir, 'post-commit');
  const hookContent = `#!/bin/sh\ndevbrain capture 2>/dev/null || true\n`;

  writeFileSync(hookPath, hookContent, 'utf-8');

  // chmod +x (no-op on Windows but correct on Mac/Linux)
  try { chmodSync(hookPath, '755'); } catch {}
}

export function isHookInstalled(repoPath: string): boolean {
  const hookPath = join(repoPath, '.git', 'hooks', 'post-commit');
  if (!existsSync(hookPath)) return false;
  try {
    const content = require('fs').readFileSync(hookPath, 'utf-8');
    return content.includes('devbrain capture');
  } catch {
    return false;
  }
}
