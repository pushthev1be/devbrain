/**
 * Tests for normalizeProjectPath — one spelling per project folder.
 */

import { describe, it, expect } from 'vitest';
import { normalizeProjectPath, sameProjectPath } from './projectPath';

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
