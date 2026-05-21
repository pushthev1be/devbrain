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

export function getLastCommit(repoPath: string): CommitInfo | null {
  try {
    const hash = execSync('git rev-parse HEAD', { cwd: repoPath, stdio: 'pipe' }).toString().trim();
    const message = execSync('git log -1 --format=%s', { cwd: repoPath, stdio: 'pipe' }).toString().trim();
    const timestamp = parseInt(execSync('git log -1 --format=%ct', { cwd: repoPath, stdio: 'pipe' }).toString().trim(), 10) * 1000;

    const stat = execSync('git show --stat --format="" HEAD', { cwd: repoPath, stdio: 'pipe' }).toString().trim();
    const diff = execSync('git show --format="" HEAD', { cwd: repoPath, stdio: 'pipe' }).toString().trim();

    return { hash, message, diff: `${stat}\n\n${diff}`, timestamp };
  } catch {
    return null;
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
