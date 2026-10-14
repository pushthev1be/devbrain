/**
 * Tests for normalizeProjectPath — one spelling per project folder.
 */

import { describe, it, expect } from 'vitest';
import { normalizeProjectPath, sameProjectPath, normalizeRemote } from './projectPath';

describe('normalizeProjectPath', () => {
  it('upper-cases the drive letter and uses backslashes', () => {
    expect(normalizeProjectPath('c:\\Users\\me\\repo')).toBe('C:\\Users\\me\\repo');
    expect(normalizeProjectPath('C:/Users/me/repo')).toBe('C:\\Users\\me\\repo');
  });

  it('drops a trailing separator but keeps a drive root', () => {
    expect(normalizeProjectPath('C:\\Users\\me\\repo\\')).toBe('C:\\Users\\me\\repo');
    expect(normalizeProjectPath('c:\\')).toBe('C:\\');
  });

  it('leaves POSIX paths alone apart from a trailing slash', () => {
    expect(normalizeProjectPath('/repo/a')).toBe('/repo/a');
    expect(normalizeProjectPath('/repo/a/')).toBe('/repo/a');
    expect(normalizeProjectPath('/')).toBe('/');
  });

  it('does not treat folder-name case as the same project', () => {
    expect(sameProjectPath('c:\\Repo', 'C:\\Repo')).toBe(true);
    expect(sameProjectPath('C:\\Repo', 'C:\\repo')).toBe(false);
  });
});

describe('normalizeRemote', () => {
  it('spells every form of one repository the same way', () => {
    for (const url of [
      'https://github.com/Owner/Repo.git',
      'https://github.com/owner/repo',
      'https://github.com/owner/repo/',
      'http://github.com/owner/repo.git',
      'git@github.com:Owner/Repo.git',
      'ssh://git@github.com/owner/repo.git',
      'ssh://git@github.com:22/owner/repo',
      'https://user:ghp_token@github.com/owner/repo.git',
      'git://github.com/owner/repo.git',
    ]) {
      expect(normalizeRemote(url), url).toBe('github.com/owner/repo');
    }
  });

  it('keeps hosts and nested groups apart', () => {
    expect(normalizeRemote('git@gitlab.com:group/sub/repo.git')).toBe('gitlab.com/group/sub/repo');
    expect(normalizeRemote('https://gitlab.com/owner/repo')).not.toBe(normalizeRemote('https://github.com/owner/repo'));
  });

  // Never stored: a remote URL can carry a token, and the identity must not.
  it('drops credentials', () => {
    expect(normalizeRemote('https://x-access-token:abc123@github.com/o/r.git')).toBe('github.com/o/r');
  });

  it('is null for nothing', () => {
    expect(normalizeRemote('')).toBeNull();
    expect(normalizeRemote('   ')).toBeNull();
  });
});
