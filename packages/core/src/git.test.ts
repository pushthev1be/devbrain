/**
 * Tests for packages/core/src/git.ts
 *
 * These shell out to real git in a throwaway repo, because the risk in this code
 * is precisely the shell boundary: argument quoting, merge exclusion, and the
 * execSync buffer limit that silently swallowed large diffs.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// These tests drive real git subprocesses — roughly a hundred spawns across the
// file. On Windows, under the parallel load of the full suite, that intermittently
// exceeds the default 5s per-test timeout, which showed up as unrelated-looking
// failures ("excludes merge commits") that passed when the file ran alone.
// The work is genuinely slow rather than stuck, so give it room.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });
import { execSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  isGitRepo, getRepoRoot, getLastCommit, getRecentCommits, countCommits,
  removeGitHook, isHookInstalled,
} from './git';

let repo: string;

function git(args: string, cwd = repo): string {
  return execSync(`git ${args}`, { cwd, stdio: 'pipe' }).toString().trim();
}

function commit(file: string, contents: string, message: string): void {
  writeFileSync(join(repo, file), contents, 'utf-8');
  git(`add ${file}`);
  git(`commit -q -m "${message}"`);
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'devbrain-git-'));
  git('init -q .');
  git('config user.email test@example.com');
  git('config user.name Test');
  git('config commit.gpgsign false');
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

// ── repo detection ────────────────────────────────────────────────────────────

describe('repo detection', () => {
  it('recognises a git repo', () => {
    expect(isGitRepo(repo)).toBe(true);
  });

  it('rejects a plain directory', () => {
    const plain = mkdtempSync(join(tmpdir(), 'devbrain-plain-'));
    try {
      expect(isGitRepo(plain)).toBe(false);
      expect(getRepoRoot(plain)).toBeNull();
    } finally {
      rmSync(plain, { recursive: true, force: true });
    }
  });

  it('resolves the root from a subdirectory', () => {
    mkdirSync(join(repo, 'a', 'b'), { recursive: true });
    commit('seed.txt', 'x', 'seed');
    const root = getRepoRoot(join(repo, 'a', 'b'));
    // macOS reports /private/var for /var, so compare the resolved basename.
    expect(root).toBeTruthy();
    expect(root!.replace(/\\/g, '/').endsWith(repo.replace(/\\/g, '/').split('/').pop()!)).toBe(true);
  });
});

// ── reading commits ───────────────────────────────────────────────────────────

describe('getLastCommit', () => {
  it('returns null in a repo with no commits', () => {
    expect(getLastCommit(repo)).toBeNull();
  });

  it('reads message, hash, timestamp and diff of HEAD', () => {
    commit('a.txt', 'hello\n', 'feat: add greeting');
    const c = getLastCommit(repo)!;
    expect(c.message).toBe('feat: add greeting');
    expect(c.hash).toMatch(/^[0-9a-f]{40}$/);
    expect(c.timestamp).toBeGreaterThan(0);
    expect(c.diff).toContain('a.txt');
    expect(c.diff).toContain('hello');
  });

  it('survives a diff larger than execSync default maxBuffer', () => {
    // Over the old 1MB default, which made this return null — so a big refactor
    // captured nothing at all. Kept just past the threshold to stay fast.
    commit('big.txt', `${'x'.repeat(120)}\n`.repeat(12_000), 'refactor: huge change');
    const c = getLastCommit(repo)!;
    expect(c).not.toBeNull();
    expect(c.message).toBe('refactor: huge change');
    // Capped for the model, not left unbounded.
    expect(c.diff.length).toBeLessThanOrEqual(20_000);
  });
});

describe('getRecentCommits', () => {
  beforeEach(() => {
    commit('1.txt', '1', 'first');
    commit('2.txt', '2', 'second');
    commit('3.txt', '3', 'third');
  });

  it('returns commits newest first', () => {
    expect(getRecentCommits(repo, 10).map(c => c.message)).toEqual(['third', 'second', 'first']);
  });

  it('honours the limit', () => {
    expect(getRecentCommits(repo, 2).map(c => c.message)).toEqual(['third', 'second']);
  });

  it('returns an empty list for a non-positive limit', () => {
    expect(getRecentCommits(repo, 0)).toEqual([]);
    expect(getRecentCommits(repo, -3)).toEqual([]);
  });

  it('returns an empty list outside a repo rather than throwing', () => {
    const plain = mkdtempSync(join(tmpdir(), 'devbrain-plain-'));
    try {
      expect(getRecentCommits(plain, 5)).toEqual([]);
    } finally {
      rmSync(plain, { recursive: true, force: true });
    }
  });

  it('carries a distinct diff per commit', () => {
    const [third, second] = getRecentCommits(repo, 2);
    expect(third.diff).toContain('3.txt');
    expect(second.diff).toContain('2.txt');
    expect(third.hash).not.toBe(second.hash);
  });

  it('excludes merge commits', () => {
    git('checkout -q -b side');
    commit('side.txt', 's', 'side work');
    git('checkout -q -');
    commit('main.txt', 'm', 'main work');
    git('merge -q --no-ff -m "merge: side into main" side');

    const messages = getRecentCommits(repo, 20).map(c => c.message);
    expect(messages).toContain('side work');
    expect(messages).toContain('main work');
    expect(messages).not.toContain('merge: side into main');
  });
});

describe('countCommits', () => {
  it('is 0 for an empty repo', () => {
    expect(countCommits(repo)).toBe(0);
  });

  it('counts non-merge commits', () => {
    commit('1.txt', '1', 'one');
    commit('2.txt', '2', 'two');
    expect(countCommits(repo)).toBe(2);
  });

  it('is 0 outside a repo rather than throwing', () => {
    const plain = mkdtempSync(join(tmpdir(), 'devbrain-plain-'));
    try {
      expect(countCommits(plain)).toBe(0);
    } finally {
      rmSync(plain, { recursive: true, force: true });
    }
  });

  it('agrees with the number of commits getRecentCommits can return', () => {
    commit('1.txt', '1', 'one');
    commit('2.txt', '2', 'two');
    commit('3.txt', '3', 'three');
    expect(getRecentCommits(repo, countCommits(repo))).toHaveLength(countCommits(repo));
  });
});

// ── hook ──────────────────────────────────────────────────────────────────────

describe('git hook (legacy)', () => {
  const hook = () => join(repo, '.git', 'hooks', 'post-commit');

  it('reports not installed when there is none', () => {
    expect(isHookInstalled(repo)).toBe(false);
    expect(removeGitHook(repo)).toBe(false);
  });

  it('removes the hook an earlier version installed', () => {
    mkdirSync(join(repo, '.git', 'hooks'), { recursive: true });
    writeFileSync(hook(), '#!/bin/sh\ndevbrain capture 2>/dev/null || true\n');
    expect(isHookInstalled(repo)).toBe(true);
    expect(removeGitHook(repo)).toBe(true);
    expect(existsSync(hook())).toBe(false);
  });

  it('keeps other commands in a shared hook file', () => {
    mkdirSync(join(repo, '.git', 'hooks'), { recursive: true });
    writeFileSync(hook(), '#!/bin/sh\nnpm run lint\ndevbrain capture 2>/dev/null || true\n');
    removeGitHook(repo);
    expect(readFileSync(hook(), 'utf-8')).toBe('#!/bin/sh\nnpm run lint\n');
  });
});
